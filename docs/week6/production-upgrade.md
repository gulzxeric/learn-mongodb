# Week 6：生产级升级

> 把 week-04-fastapi 从"跑起来就行"改造成"敢上线"的生产级代码。

## 架构总览

```
week-04-fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py                    ← 入口 + lifespan + CORS + 异常处理器注册
│   ├── config.py                  ← pydantic-settings（环境变量类型校验）
│   ├── database.py                ← Depends 模式连接管理
│   ├── exceptions.py              ← 自定义异常 + 全局异常处理器
│   ├── logging_conf.py             ← 结构化日志
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── tags.py                ← 变薄：只做 HTTP 层
│   │   ├── categories.py
│   │   ├── users.py
│   │   ├── posts.py
│   │   ├── comments.py
│   │   ├── stats.py
│   │   └── health.py               ← 新增：健康检查
│   ├── services/                   ← 新增：业务逻辑层
│   │   ├── __init__.py
│   │   ├── tag_service.py
│   │   ├── category_service.py
│   │   ├── user_service.py
│   │   ├── post_service.py
│   │   └── comment_service.py
│   ├── seed.py
│   └── tests/                      ← 新增
│       ├── __init__.py
│       ├── test_tags.py
│       └── conftest.py
├── requirements.txt
├── Dockerfile                       ← 新增
├── .dockerignore                    ← 新增
└── .env.example                     ← 新增
```

## 三层架构

```
路由层 (routers/)      只处理 HTTP 请求/响应
    ↓ 调用
服务层 (services/)     业务逻辑、校验、编排
    ↓ 调用
数据层 (database.py)   MongoDB 连接、CRUD
```

每一层只干自己的事，不越界。

---

## 第 1 项：config.py → pydantic-settings

### 当前的问题

```python
# 当前写法
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = "blog"
```

- `os.getenv` 返回 `str`，拼错字段名不报错
- IDE 不会补全，你得去翻 `.env` 才知道有什么变量
- 多环境（dev/staging/prod）要手动切换 `.env` 文件

### 改后

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "blog"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
```

### 好处

- **类型校验**：启动时 `MONGO_URI` 不是字符串？直接报错
- **IDE 自动补全**：敲 `settings.` 就弹出所有字段
- **环境变量优先**：`export MONGO_URI=xxx` 会覆盖 `.env` 文件的值，生产部署用这个

### 安装

```bash
pip install pydantic-settings
```

---

## 第 2 项：database.py → Depends

### 当前的问题

```python
def get_db():
    global client
    if client is None:
        client = MongoClient(MONGO_URI)
    return client[DATABASE_NAME]
```

- `global` 关键字让代码难以测试
- 想换测试数据库得用 `unittest.mock.patch` 拦截

### 改后

```python
# app/database.py
from pymongo import MongoClient
from app.config import settings

client: MongoClient | None = None


def get_client() -> MongoClient:
    global client
    if client is None:
        client = MongoClient(settings.MONGO_URI)
    return client


def get_db():
    db = get_client()[settings.DATABASE_NAME]
    try:
        yield db
    finally:
        pass  # 连接复用，不关闭
```

### 在路由中使用

```python
from fastapi import Depends
from pymongo.database import Database

@router.get("/tags", response_model=list[TagResponse])
def list_tags(db: Database = Depends(get_db)):
    tags = db.tags.find().sort("name", 1)
    return [TagResponse(**t) for t in tags]
```

### 测试时替换

```python
# tests/conftest.py
from app.database import get_db

async def override_get_db():
    test_client = MongoClient("mongodb://localhost:27017/test")
    yield test_client["test"]
    test_client.drop_database("test")
    test_client.close()

app.dependency_overrides[get_db] = override_get_db
```

### lifespan 的作用变化

启动时不做懒加载，而是**主动验证连接**：

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时验证数据库连接
    try:
        get_client().admin.command("ping")
        logger.info("MongoDB 连接成功")
    except Exception as e:
        logger.error(f"MongoDB 连接失败: {e}")
        raise
    yield
    close_db()
```

---

## 第 3 项：启动时验证 DB 连接

### 为什么

当前代码只有在请求进来时才连接数据库。如果 `.env` 里的连接串写错了，uvicorn 启动时不会有任何提示，直到第一个请求进来才 500。

生产环境的要求是：**启动时就把所有外部依赖检查完，连不上就不启动**。

### 做法

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    client = get_client()
    try:
        client.admin.command("ping")
        logger.info("MongoDB 连接成功")
    except Exception as e:
        logger.critical(f"MongoDB 连接失败: {e}")
        raise RuntimeError(f"无法连接 MongoDB: {e}")
    yield
    close_db()
```

`admin.command("ping")` 是 MongoDB 的"检查连接是否存活"命令。

---

## 第 4 项：全局异常处理器

### 当前的问题

- 找不到资源 → 返回 404，但错误格式不统一
- 参数校验失败 → FastAPI 默认返回的 422 格式跟你自定义的错误不一样
- 未捕获异常 → 500 裸报错，客户端收到一堆堆栈

### 改后

```python
# app/exceptions.py
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("未捕获的异常")
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误"},
    )
```

```python
# main.py 中注册
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)
```

### 统一错误响应格式

所有错误返回统一结构：

```json
{
    "detail": "Tag not found",
    "status_code": 404
}
```

---

## 第 5 项：新增 services/ 业务逻辑层

### 为什么

现在路由里直接操作数据库：

```python
# 当前：路由里又做校验又查数据库
@router.post("", status_code=201)
def create_tag(body: TagCreate, db=Depends(get_db)):
    result = db.tags.insert_one(body.model_dump())
    tag = db.tags.find_one({"_id": result.inserted_id})
    return TagResponse(**tag)
```

问题：路由越来越胖，业务逻辑分散在各个路由器里，没法复用。

### 改后

```python
# app/services/tag_service.py
from pymongo.database import Database
from app.schemas import TagCreate, TagUpdate


class TagService:
    def __init__(self, db: Database):
        self.db = db

    def list(self) -> list[dict]:
        return list(self.db.tags.find().sort("name", 1))

    def get_by_id(self, tag_id: str) -> dict | None:
        return self.db.tags.find_one({"_id": ObjectId(tag_id)})

    def create(self, data: TagCreate) -> dict:
        result = self.db.tags.insert_one(data.model_dump())
        return self.db.tags.find_one({"_id": result.inserted_id})

    def update(self, tag_id: str, data: TagUpdate) -> dict | None:
        result = self.db.tags.update_one(
            {"_id": ObjectId(tag_id)},
            {"$set": data.model_dump()}
        )
        if result.matched_count == 0:
            return None
        return self.db.tags.find_one({"_id": ObjectId(tag_id)})

    def delete(self, tag_id: str) -> bool:
        result = self.db.tags.delete_one({"_id": ObjectId(tag_id)})
        return result.deleted_count > 0
```

```python
# app/routers/tags.py（变薄后）
from fastapi import APIRouter, Depends
from pymongo.database import Database
from app.database import get_db
from app.services.tag_service import TagService
from app.schemas import TagCreate, TagUpdate, TagResponse
from app.exceptions import AppException

router = APIRouter(prefix="/tags", tags=["tags"])


def get_tag_service(db: Database = Depends(get_db)) -> TagService:
    return TagService(db)


@router.get("", response_model=list[TagResponse])
def list_tags(service: TagService = Depends(get_tag_service)):
    return [TagResponse(**t) for t in service.list()]


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: str, service: TagService = Depends(get_tag_service)):
    tag = service.get_by_id(tag_id)
    if not tag:
        raise AppException(404, "Tag not found")
    return TagResponse(**tag)


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(body: TagCreate, service: TagService = Depends(get_tag_service)):
    tag = service.create(body)
    return TagResponse(**tag)


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: str, body: TagUpdate, service: TagService = Depends(get_tag_service)):
    if not ObjectId.is_valid(tag_id):
        raise AppException(400, "Invalid tag ID")
    tag = service.update(tag_id, body)
    if not tag:
        raise AppException(404, "Tag not found")
    return TagResponse(**tag)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: str, service: TagService = Depends(get_tag_service)):
    if not ObjectId.is_valid(tag_id):
        raise AppException(400, "Invalid tag ID")
    if not service.delete(tag_id):
        raise AppException(404, "Tag not found")
```

### 分层职责

| 层 | 职责 | 知道什么 |
|----|------|---------|
| `routers/` | HTTP、参数、状态码、响应格式 | 知道 HTTP |
| `services/` | 业务逻辑、引用校验、编排 | 知道领域逻辑 |
| `database.py` | 连接管理、Depends | 知道 MongoDB |

### 哪些实体需要 Service 层

| 实体 | 复杂度 | 需要 Service？ |
|------|--------|---------------|
| Tag | 纯 CRUD | 可要可不要（为了统一，建） |
| Category | 纯 CRUD | 可要可不要 |
| User | 纯 CRUD | 可要可不要 |
| Post | 引用校验、分页、过滤 | **要** |
| Comment | 计数器维护 | **要** |

---

## 第 6 项：CORS + 健康检查 + 日志

### CORS

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**为什么：** 前端在另一个域名（比如 `localhost:5173`）发请求时，浏览器会拦截跨域请求。CORS 中间件告诉浏览器"允许这些来源访问 API"。

### 健康检查

```python
# app/routers/health.py
from fastapi import APIRouter, Depends
from pymongo.database import Database
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Database = Depends(get_db)):
    try:
        db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}
```

### 日志

```python
# app/logging_conf.py
import logging
import sys


def setup_logging(level: str = "INFO"):
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # 降低 pymongo 的日志噪音
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
```

### lifespan 中注册

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.LOG_LEVEL)
    logger = logging.getLogger(__name__)
    ...
```

---

## 第 7 项：依赖管理 + Dockerfile

### requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pymongo==4.9.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-dotenv==1.0.1
```

新增 `pydantic-settings`，删除 `python-dotenv`（pydantic-settings 自带 .env 读取能力，不过保留也可以，不影响）。

### Dockerfile

```dockerfile
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### .dockerignore

```
__pycache__
.venv
.env
.git
*.md
```

---

## 不改的

| 事项 | 说明 |
|------|------|
| 异步驱动 | 不换 motor，保持 pymongo 同步。生产项目可以考虑换，但这不是本次范围 |
| API 接口 | 不改现有路由路径和响应格式，保持向后兼容 |
| 数据模型 | 5 个集合不变，字段不变 |
| 种子数据 | 保留，不改 |
| JWT 认证 | 不加。那是另一节课的内容 |
| Rate Limiting | 不加。生产项目会加，但这里偏了主题 |

---

## 执行顺序

```
1. config.py        → 替换为 pydantic-settings
2. exceptions.py    → 新增
3. logging_conf.py  → 新增
4. database.py      → 替换为 Depends 模式
5. main.py          → 注册 CORS、异常处理器、健康检查、lifespan
6. services/        → 新增 5 个 service
7. routers/         → 瘦身：移业务逻辑到 service
8. health.py        → 新增
9. tests/           → 新增
10. Dockerfile      → 新增
11. requirements.txt → 更新
12. 启动验证
```

---

## 附录：Depends 原理

```python
from fastapi import Depends

def get_db():
    yield db  # 每个请求开始执行
    # 请求结束后回到这里

@app.get("/tags")
def list_tags(db=Depends(get_db)):  # FastAPI 自动调用 get_db()
    ...
```

`Depends` 做了两件事：
1. 调用 `get_db()` 拿到 `db` 实例，注入到路由函数的 `db` 参数
2. 请求结束后，回到 `yield` 后面执行收尾代码

**它和直接调用的区别：**

```python
# 直接调用——测试时没法替换
def list_tags():
    db = get_db()
    ...

# Depends——测试时一行替换
app.dependency_overrides[get_db] = lambda: test_db
```

---

## 附录：各层为什么这么分

```
客户端请求
    ↓
routers/（解析参数、选择状态码、决定响应格式）
    ↓ 调用
services/（检查数据是否合法、组合多个查询、维护计数器）
    ↓ 调用
database.py（就是 MongoDB 操作）
```

**不分开的后果：**

路由里混了业务逻辑 → 某个路由想复用"创建评论并更新计数"这个逻辑 → 要么复制代码，要么硬调用另一个路由 → 越来越乱。

**分开了的好处：**

- `comment_service.create()` 可以在路由里用，也可以在脚本里用，也可以在测试里用
- 改数据库逻辑不用碰 HTTP 层
- 加新接口只需要写路由层，业务逻辑复用已有的 service
