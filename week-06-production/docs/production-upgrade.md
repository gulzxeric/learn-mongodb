# Week 6 — FastAPI 生产级升级

## 目标

基于 week-04-fastapi，做生产级改造：配置管理、异常处理、结构化日志、Service 层解耦、启动健康检查、CORS、Docker 化。

## 改动清单

| 层级 | week-04 | week-06 |
|------|---------|---------|
| 配置 | 硬编码字符串 | `pydantic-settings` + `.env` |
| 数据库 | 裸 `MongoClient()` | `verify_db_connection()` 启动时 ping |
| 异常 | `HTTPException` 散落在 router | `AppException` + 全局 handler |
| 日志 | `print()` | `logging_conf.py` 结构化格式 |
| 业务逻辑 | 写在 router 里 | `services/` 5 个 Service 类 |
| 路由 | 直接操作 db | via `Depends(Service)` |
| CORS | 无 | `CORSMiddleware` |
| 健康检查 | 无 | `GET /health` |
| 容器化 | 无 | `Dockerfile` + `.dockerignore` |

## 文件结构

```
week-06-production/
├── Dockerfile / .dockerignore
├── requirements.txt / .env / README.md
└── app/
    ├── main.py               # 入口：lifespan + CORS + 异常注册 + 7 个 router
    ├── config.py              # Settings(pydantic-settings)
    ├── database.py            # get_db() + close_db() + verify_db_connection()
    ├── exceptions.py          # AppException + app/global handler
    ├── logging_conf.py        # setup_logging() 结构化日志
    ├── schemas.py / helpers.py / seed.py  # 同 week-4，未改动
    ├── routers/
    │   ├── tags.py / categories.py / users.py / posts.py
    │   ├── comments.py / stats.py
    │   └── health.py          # GET /health → ping MongoDB
    └── services/              # 业务逻辑层，router 通过 Depends 使用
        ├── tag_service.py / category_service.py / user_service.py
        ├── post_service.py / comment_service.py
        └── __init__.py
```

## 核心文件详解

### main.py — 启动生命周期

- `lifespan` 异步上下文管理器：启动时调 `setup_logging()` → `verify_db_connection()`，关闭时调 `close_db()`
- `CORSMiddleware` 配置源来自 `settings.CORS_ORIGINS`
- 注册两个异常处理器：`AppException` → 自定义 JSON 响应，`Exception` → 500 兜底
- 7 个 router：tags, categories, users, posts, comments, stats, health

### config.py — pydantic-settings

```python
class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "blog"
    CORS_ORIGINS: list[str] = ["*"]
    LOG_LEVEL: str = "INFO"
    # 从项目根目录 .env 文件自动读取
```

- 所有配置集中在 `Settings` 类，默认值 + `.env` 覆盖
- 避免硬编码连接字符串在代码中

### database.py — 连接管理

- `get_db()` 惰性创建 `MongoClient`（单例）
- `verify_db_connection()` 启动时 `admin.command("ping")`，失败则阻断启动
- `close_db()` 关闭连接，防止端口占用

### exceptions.py — 统一异常

- `AppException(status_code, detail)` 在 Service 层抛出
- `app_exception_handler` → 返回 `{"detail": "..."}` 对应 HTTP 状态码
- `global_exception_handler` → 500 + 日志记录 traceback

### services/ — 业务逻辑层

每个 Service 类封装一个集合的 CRUD，通过 `Depends(get_x_service())` 注入路由：

```
Router (HTTP) → Depends(Service) → database (pymongo)
```

- `tag_service.py` / `category_service.py` / `user_service.py` / `post_service.py` / `comment_service.py`
- 异常统一抛 `AppException`，不在 router 里写 `if not doc: raise`
- `ObjectId` 转换和校验在 Service 内部完成，router 接收/返回 str

### health.py — 健康检查

```python
GET /health → {"status": "ok", "database": "connected"}
            或 {"status": "error", "database": "<异常信息>"}
```

- 定时任务/负载均衡器轮询用

### Dockerfile

- 基于 `python:3.11-slim`，多阶段拷贝，`uvicorn` 生产运行
- `.dockerignore` 排除 `__pycache__`、`.env`、`venv`

## 运行

```bash
cd week-06-production
pip install -r requirements.txt
# 编辑 .env 中的 MONGO_URI
python -m uvicorn app.main:app --reload
```

## 与原 week-04 的区别

- week-04 的 router 直接 `import get_db` + 裸 `HTTPException`
- week-06 用 `Depends` 注入 Service，异常统一，配置外部化
- 新增 `/health`、CORS、Docker、日志、启动自检
