# 第 4 周：FastAPI 博客 CMS API

## 本周目标

用 FastAPI 把前 3 周学的 MongoDB 知识封装成 RESTful API，构建一个可运行的博客 CMS 后端。

## 技术栈

| 层 | 技术 |
|---|------|
| Web 框架 | FastAPI |
| 数据库驱动 | pymongo |
| 数据验证 | Pydantic v2 |
| 运行 | uvicorn |
| API 文档 | Swagger (自动生成) |

## 目录结构

```
week-04-fastapi/
├── README.md              ← 你正在看这个
├── requirements.txt       ← 依赖
├── .env                   ← 数据库连接串
├── app/
│   ├── __init__.py
│   ├── main.py            ← FastAPI 入口
│   ├── config.py          ← 配置管理
│   ├── database.py        ← MongoDB 连接
│   ├── schemas.py         ← Pydantic 数据模型
│   ├── helpers.py         ← 工具函数
│   ├── seed.py            ← 批量测试数据
│   └── routers/
│       ├── __init__.py
│       ├── tags.py
│       ├── categories.py
│       ├── users.py
│       ├── posts.py
│       ├── comments.py
│       └── stats.py
```

## 执行顺序

```
1. pip install -r requirements.txt     ← 装依赖
2. python -m app.seed                  ← 导入种子数据
3. uvicorn app.main:app --reload       ← 启动 API
4. 浏览器打开 http://localhost:8000/docs ← Swagger 文档
```

---

## Step 1：项目骨架

### 创建目录

```
week-04-fastapi/
├── app/
│   ├── __init__.py
│   └── routers/
│       └── __init__.py
├── requirements.txt
└── .env
```

### 安装依赖

```bash
pip install fastapi uvicorn pymongo python-dotenv pydantic
```

或者：

```bash
pip install -r requirements.txt
```

### 验证安装

```bash
python -c "import fastapi; print(fastapi.__version__)"
python -c "import pymongo; print(pymongo.__version__)"
```

---

## Step 2：配置管理

**问题：** 数据库连接串不能硬编码在代码里。

**解决：** 用 `.env` 文件 + `python-dotenv` 加载。

### app/config.py

```python
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = "blog"
```

关键点：
- `__file__` 是当前文件路径，用 `resolve()` 拿到绝对路径
- `parent.parent` 往上两层从 `app/config.py` 到项目根目录
- `os.getenv()` 第二个参数是默认值

`.env` 文件内容：

```
MONGO_URI=mongodb+srv://用户名:密码@cluster0.n07y6rd.mongodb.net/
```

### SQL 对比

```sql
-- SQL：连接串写在配置文件里
DATABASE_URL=postgresql://user:pass@localhost:5432/blog
```

MongoDB 也一样——连接串放环境变量，代码里只读环境变量。

---

## Step 3：数据库连接

**问题：** 每个请求都要连数据库吗？不需要。连接可以复用。

### app/database.py

```python
from pymongo import MongoClient
from app.config import MONGO_URI, DATABASE_NAME

client: MongoClient | None = None


def get_db():
    global client
    if client is None:
        client = MongoClient(MONGO_URI)
    return client[DATABASE_NAME]


def close_db():
    global client
    if client:
        client.close()
        client = None
```

关键点：
- **单例模式**：`client` 全局只创建一次，所有请求复用
- `get_db()` 返回 `blog` 数据库实例
- `close_db()` 在应用关闭时调用

### 为什么重用连接？

```python
# 错误做法：每次请求都建新连接
def get_db():
    return MongoClient(MONGO_URI)["blog"]  # ❌ 连接浪费

# 正确做法：复用连接
client = MongoClient(MONGO_URI)  # ✅ 起一次就够了
def get_db():
    return client["blog"]
```

MongoDB 的连接池会自动管理底层 TCP 连接，重用即可。

### FastAPI 生命周期

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    yield
    # 关闭时
    close_db()

app = FastAPI(lifespan=lifespan)
```

`lifespan` 是 FastAPI 的应用生命周期钩子——启动后执行 `yield` 前，关闭时执行 `yield` 后。

---

## Step 4：Pydantic 数据模型

**问题：** API 收到请求数据后，怎么校验字段类型、长度、格式？

**解决：** Pydantic——定义数据模型，自动校验和序列化。

### 什么是 Pydantic？

```python
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=30)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# FastAPI 自动校验请求体
@app.post("/users")
def create_user(body: UserCreate):  # body 已经校验好了
    ...
```

### Schema 设计原则

每个实体设计三个 schema：

| Schema | 用途 | 特点 |
|--------|------|------|
| `XxxCreate` | 创建时请求体 | 必填字段 |
| `XxxUpdate` | 更新时请求体 | 可选字段 |
| `XxxResponse` | 返回给客户端 | 含 `_id`、`createdAt` 等 |

### ObjectId 处理

MongoDB 的 `_id` 是 `ObjectId` 类型，不能直接 JSON 序列化。需要转换：

```python
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError(f"Invalid ObjectId: {v}")
        return str(v)
```

这样 Pydantic 就能自动把 `ObjectId` 转成 `str` 返回给客户端。

### ResponseSchema 的关键配置

```python
class TagResponse(BaseModel):
    id: str = Field(alias="_id")  # MongoDB 字段叫 _id，返回给客户端叫 id
    name: str

    model_config = {"populate_by_name": True}
```

- `alias="_id"`：Python 字段名叫 `id`，但 MongoDB 存的是 `_id`
- `populate_by_name=True`：既可以用 `_id` 也可以用 `id` 传参

### 完整 Schema 清单

看 `app/schemas.py`，5 个实体的 create / update / response 都在里面。

---

## Step 5：Tags 路由（最简单的 CRUD）

**目标：** 实现完整的增删改查，作为"样板"，后面路由都仿照这个模式。

### 路由结构

```python
from fastapi import APIRouter, HTTPException
from bson import ObjectId

router = APIRouter(prefix="/tags", tags=["tags"])
```

- `prefix="/tags"`：所有路由自动加 `/tags` 前缀
- `tags=["tags"]`：Swagger 文档里分组显示

### 查询列表

```python
@router.get("", response_model=list[TagResponse])
def list_tags():
    db = get_db()
    tags = db.tags.find().sort("name", 1)
    return [TagResponse(**t) for t in tags]
```

- `response_model=list[TagResponse]`：FastAPI 自动把返回数据转成 Pydantic 模型
- `TagResponse(**t)`：把 MongoDB 文档 dict 解包传入 Pydantic

### 查询单个

```python
@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: str):
    if not ObjectId.is_valid(tag_id):
        raise HTTPException(400, "Invalid tag ID")
    db = get_db()
    tag = db.tags.find_one({"_id": ObjectId(tag_id)})
    if not tag:
        raise HTTPException(404, "Tag not found")
    return TagResponse(**tag)
```

- `{tag_id}`：路径参数，FastAPI 自动提取
- **先校验 ObjectId 格式**，再查数据库——防止无效 ID 报错
- 查不到返回 404

### 创建

```python
@router.post("", response_model=TagResponse, status_code=201)
def create_tag(body: TagCreate):
    db = get_db()
    result = db.tags.insert_one(body.model_dump())
    tag = db.tags.find_one({"_id": result.inserted_id})
    return TagResponse(**tag)
```

- `status_code=201`：创建资源返回 201
- `body.model_dump()`：Pydantic 模型转 dict
- 插入后重新查询拿到完整文档（含 `_id`）

### 更新

```python
@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: str, body: TagUpdate):
    if not ObjectId.is_valid(tag_id):
        raise HTTPException(400, "Invalid tag ID")
    db = get_db()
    result = db.tags.update_one(
        {"_id": ObjectId(tag_id)},
        {"$set": body.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Tag not found")
    tag = db.tags.find_one({"_id": ObjectId(tag_id)})
    return TagResponse(**tag)
```

- `matched_count`：匹配到的文档数（不是修改的）
- 匹配到 0 条 → 404

### 删除

```python
@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: str):
    if not ObjectId.is_valid(tag_id):
        raise HTTPException(400, "Invalid tag ID")
    db = get_db()
    result = db.tags.delete_one({"_id": ObjectId(tag_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Tag not found")
```

- `status_code=204`：删除成功不返回内容
- `deleted_count`：实际删除了多少条

### API 设计规范

| 操作 | 方法 | 路径 | 状态码 | 响应体 |
|------|------|------|--------|--------|
| 列表 | GET | /tags | 200 | 数组 |
| 详情 | GET | /tags/{id} | 200 | 对象 |
| 创建 | POST | /tags | 201 | 对象 |
| 更新 | PUT | /tags/{id} | 200 | 对象 |
| 删除 | DELETE | /tags/{id} | 204 | 无 |

---

## Step 6：Categories + Users 路由

Categories 和 Users 的结构与 Tags 几乎一样，只是字段不同。

### Categories

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /categories | 列表 |
| GET | /categories/{id} | 详情 |
| POST | /categories | 创建 |
| PUT | /categories/{id} | 更新 |
| DELETE | /categories/{id} | 删除 |

字段：`name`, `slug`

### Users

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users | 列表 |
| GET | /users/{id} | 详情 |
| POST | /users | 创建 |
| PUT | /users/{id} | 更新 |
| DELETE | /users/{id} | 删除 |

字段：`username`, `email`, `createdAt`

**User 更新的特殊处理：**

```python
update_data = {k: v for k, v in body.model_dump().items() if v is not None}
if not update_data:
    raise HTTPException(400, "No fields to update")
```

- 只更新非 `None` 的字段（PATCH 语义）
- 如果所有字段都是 `None`，返回 400

---

## Step 7：Posts 路由（最复杂）

文章涉及引用字段（authorId, categoryId, tags[]），比其他实体复杂。

### 创建时验证引用

```python
@router.post("", response_model=PostResponse, status_code=201)
def create_post(body: PostCreate):
    db = get_db()
    if not db.users.find_one({"_id": ObjectId(body.authorId)}):
        raise HTTPException(400, "Author not found")
    if not db.categories.find_one({"_id": ObjectId(body.categoryId)}):
        raise HTTPException(400, "Category not found")
    ...
```

**为什么？** MongoDB 不强制外键约束，应用层自己保证引用有效性。

### ObjectId 字段转换

```python
doc = body.model_dump()
doc["authorId"] = ObjectId(body.authorId)      # str → ObjectId
doc["categoryId"] = ObjectId(body.categoryId)  # str → ObjectId
doc["tags"] = [ObjectId(t) for t in body.tags] # [str] → [ObjectId]
doc["commentCount"] = 0
doc["createdAt"] = datetime.now()
doc["updatedAt"] = datetime.now()
```

Pydantic 收到的是字符串，存到 MongoDB 要转成 ObjectId。

### 列表查询支持过滤

```python
@router.get("", response_model=dict)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    author_id: str | None = None,
    category_id: str | None = None,
    tag_id: str | None = None,
    published: bool | None = None,
    search: str | None = None,
):
    query = {}
    if author_id:
        query["authorId"] = ObjectId(author_id)
    if category_id:
        query["categoryId"] = ObjectId(category_id)
    if tag_id:
        query["tags"] = ObjectId(tag_id)
    if published is not None:
        query["published"] = published
    if search:
        query["$text"] = {"$search": search}
    ...
```

**动态查询构造**——根据参数决定查询条件，是 API 开发的常见模式。

---

## Step 8：Comments 路由

评论比文章简单，但有两个特点：
1. 创建评论时自动更新文章的 `commentCount`
2. 删除评论时自动减 `commentCount`

### 自动维护计数器

```python
# 创建评论
result = db.comments.insert_one(doc)
db.posts.update_one(
    {"_id": ObjectId(body.postId)},
    {"$inc": {"commentCount": 1}}  # 自增 1
)

# 删除评论
comment = db.comments.find_one({"_id": ObjectId(comment_id)})
db.posts.update_one(
    {"_id": comment["postId"]},
    {"$inc": {"commentCount": -1}}  # 自减 1
)
db.comments.delete_one({"_id": ObjectId(comment_id)})
```

`$inc` 是 MongoDB 的原子加减操作，比先查后写更安全。

### 按文章过滤

```python
@router.get("")
def list_comments(post_id: str | None = None, ...):
    query = {}
    if post_id:
        query["postId"] = ObjectId(post_id)
    ...
```

---

## Step 9：分页

所有列表接口都支持分页。

### 分页参数

```python
from fastapi import Query

page: int = Query(1, ge=1)              # 第几页，默认第 1 页
page_size: int = Query(10, ge=1, le=100) # 每页条数，默认 10，最多 100
```

### MongoDB 分页

```python
total = db.collection.count_documents(query)  # 总条数
data = (
    db.collection.find(query)
    .sort("createdAt", -1)
    .skip((page - 1) * page_size)  # 跳过前面的
    .limit(page_size)               # 只取 page_size 条
)
```

### 统一返回格式

```python
return {
    "items": [...],      # 当前页数据
    "total": 100,        # 总条数
    "page": 1,           # 当前页码
    "page_size": 10,     # 每页条数
}
```

### SQL 对比

```sql
-- SQL 分页
SELECT * FROM posts ORDER BY created_at DESC
LIMIT 10 OFFSET 0;
```

```javascript
// MongoDB 分页
db.posts.find().sort({createdAt: -1}).skip(0).limit(10)
```

---

## Step 10：聚合统计路由

用第 3 周学的聚合管道，封装成统计接口。

### 标签云

```javascript
// MongoDB 聚合
db.posts.aggregate([
  { $unwind: "$tags" },              // 拆数组
  { $group: { _id: "$tags", count: { $sum: 1 } } },  // 按标签分组
  { $sort: { count: -1 } },          // 按使用次数降序
  { $limit: 20 }                     // 取前 20
])
```

```python
# FastAPI
@router.get("/tag-cloud")
def tag_cloud():
    db = get_db()
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    results = list(db.posts.aggregate(pipeline))
    # 回填标签名称
    tag_ids = [r["_id"] for r in results]
    tags = {t["_id"]: t["name"] for t in db.tags.find({"_id": {"$in": tag_ids}})}
    return [
        {"tag_id": str(r["_id"]), "name": tags.get(r["_id"], "未知"), "count": r["count"]}
        for r in results
    ]
```

### 作者排行

```python
pipeline = [
    {"$group": {"_id": "$authorId", "post_count": {"$sum": 1}}},
    {"$sort": {"post_count": -1}},
]
```

### 综合看板

```python
@router.get("/dashboard")
def dashboard():
    return {
        "total_posts": db.posts.count_documents({}),
        "total_comments": db.comments.count_documents({}),
        "total_users": db.users.count_documents({}),
        ...
    }
```

---

## Step 11：种子数据脚本

### 为什么需要种子数据？

开发 API 时，数据库里有数据才能测试。种子数据脚本一键填充测试数据。

### 实现思路

```python
def seed():
    db = get_db()

    # 1. 清空所有集合（可重复执行）
    db.users.drop()
    db.categories.drop()
    ...

    # 2. 插入固定数据
    users_data = [
        {"_id": ObjectId(), "username": "alice", ...},
        ...
    ]
    db.users.insert_many(users_data)

    # 3. 用 ObjectId 引用关联
    user_map = {u["username"]: u["_id"] for u in users_data}

    # 4. 插入文章时引用 user_id
    db.posts.insert_many([
        {"title": "...", "authorId": user_map["alice"], ...},
        ...
    ])

    # 5. 维护 commentCount
    for p in all_posts:
        count = db.comments.count_documents({"postId": p["_id"]})
        db.posts.update_one({"_id": p["_id"]}, {"$set": {"commentCount": count}})

    # 6. 建索引
    db.posts.create_index("authorId")
    ...
```

### 运行

```bash
python -m app.seed
```

---

## Step 12：启动验证

### 启动

```bash
uvicorn app.main:app --reload
```

- `app.main:app`：`app/main.py` 里的 `app` 对象
- `--reload`：代码修改后自动重启（开发模式）

### 访问 Swagger 文档

打开浏览器：`http://localhost:8000/docs`

FastAPI 自动生成交互式 API 文档，可以直接在页面里测试每个接口。

### 测试流程

1. **先看 Swagger** — 确认所有路由都显示
2. **试 GET 接口** — /tags, /categories, /users, /posts, /comments
3. **试 POST** — 创建一个新标签
4. **试 PUT** — 修改标签名称
5. **试 DELETE** — 删除标签
6. **试统计** — /stats/dashboard, /stats/tag-cloud
7. **试分页** — /posts?page=1&page_size=5

---

## 常见问题

### ObjectId is not JSON serializable

```python
# ❌ 直接返回 MongoDB 文档会报错
return db.tags.find_one({"_id": ObjectId("...")})

# ✅ 用 Pydantic 模型转换
return TagResponse(**db.tags.find_one({"_id": ObjectId("...")}))
```

### 路径参数位置

```python
# ✅ 正确：/tags 和 /tags/{tag_id} 不会冲突
/tags       ← 列表
/tags/{id}  ← 详情

# ❌ 错误：这样写 /tags/create 会被当成 /tags/{id}
/tags/create  ← FastAPI 会把 "create" 当成 tag_id
```

### 更新全部 vs 更新部分

| | PUT | PATCH |
|--|-----|-------|
| 语义 | 替换整个资源 | 修改部分字段 |
| 请求体 | 必须传所有字段 | 只传要改的字段 |
| 本项目 | 用 PUT + 可选字段 | 实现的是 PATCH 逻辑 |

实际项目中，PUT 要求全量，PATCH 是部分更新。本项目统一用 PUT 但字段都是可选的——教学简化。

---

## 接口速查表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /tags | 标签列表 |
| GET | /tags/{id} | 标签详情 |
| POST | /tags | 创建标签 |
| PUT | /tags/{id} | 更新标签 |
| DELETE | /tags/{id} | 删除标签 |
| GET | /categories | 分类列表 |
| GET | /categories/{id} | 分类详情 |
| POST | /categories | 创建分类 |
| PUT | /categories/{id} | 更新分类 |
| DELETE | /categories/{id} | 删除分类 |
| GET | /users | 用户列表 |
| GET | /users/{id} | 用户详情 |
| POST | /users | 创建用户 |
| PUT | /users/{id} | 更新用户 |
| DELETE | /users/{id} | 删除用户 |
| GET | /posts | 文章列表（支持分页/过滤） |
| GET | /posts/{id} | 文章详情 |
| POST | /posts | 创建文章 |
| PUT | /posts/{id} | 更新文章 |
| DELETE | /posts/{id} | 删除文章 |
| GET | /comments | 评论列表（支持分页/按文章过滤） |
| GET | /comments/{id} | 评论详情 |
| POST | /comments | 创建评论 |
| DELETE | /comments/{id} | 删除评论 |
| GET | /stats/tag-cloud | 标签云统计 |
| GET | /stats/author-ranking | 作者发文排行 |
| GET | /stats/category-summary | 分类统计 |
| GET | /stats/dashboard | 综合看板 |

---

## 本周总结

### 你学到了什么

1. **FastAPI 项目结构** — 模块化路由拆分
2. **Pydantic 数据校验** — 自动校验请求体、序列化响应
3. **MongoDB 连接管理** — 单例模式 + 生命周期
4. **CRUD 通用模式** — 所有实体统一的增删改查
5. **引用字段处理** — str ↔ ObjectId 转换
6. **自动计数器** — 评论数用 $inc 维护
7. **分页** — skip + limit
8. **聚合管道封装** — 统计接口
9. **种子数据** — 可重复执行的测试数据
10. **Swagger 文档** — 自动生成，可交互测试

### 和第 5 周的关系

Week 5 会做 Express (Node.js) 版本，你会发现架构思路完全一样，只是语法变成 JavaScript。

| 概念 | FastAPI (Python) | Express (Node.js) |
|------|-----------------|-------------------|
| 路由 | `@router.get()` | `router.get()` |
| 校验 | Pydantic | Joi / Zod |
| 连接 | pymongo | mongodb 驱动 |
| 文档 | 自动 Swagger | swagger-jsdoc |
