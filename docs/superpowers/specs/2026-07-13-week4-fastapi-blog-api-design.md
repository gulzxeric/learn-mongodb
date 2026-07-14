# Week 4：FastAPI 博客 CMS API 设计文档

## 背景

前 3 周完成了 MongoDB 的基础 CRUD、文档建模和聚合管道。Week 4 用 FastAPI 封装 RESTful API，构建一个可运行的博客 CMS 后端。

## 目录结构

```
week-04-fastapi/
├── README.md              ← 完整学习路径（教学文档，Step-by-step）
├── requirements.txt       ← 依赖
├── .env                   ← MONGO_URI（引用根目录）
├── app/
│   ├── __init__.py
│   ├── main.py            ← FastAPI 入口 + 应用生命周期
│   ├── config.py          ← 配置管理（从 .env 加载）
│   ├── database.py        ← MongoDB 连接管理
│   ├── schemas.py         ← Pydantic 模型（5 个实体 + 通用分页）
│   ├── helpers.py         ← 通用工具（ObjectId 转换、分页参数）
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── tags.py
│   │   ├── categories.py
│   │   ├── users.py
│   │   ├── posts.py
│   │   ├── comments.py
│   │   └── stats.py
│   └── seed.py            ← 批量测试数据脚本
```

## 数据模型

沿用 week-02 的博客数据模型，5 个集合：

| 集合 | 字段 |
|------|------|
| users | `_id, username, email, createdAt` |
| categories | `_id, name, slug` |
| tags | `_id, name` |
| posts | `_id, title, content, excerpt, authorId, categoryId, tags[], commentCount, published, createdAt, updatedAt` |
| comments | `_id, postId, authorId, body, createdAt` |

## API 接口设计

### Tags
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /tags | 标签列表 |
| GET | /tags/{id} | 标签详情 |
| POST | /tags | 创建标签 |
| PUT | /tags/{id} | 更新标签 |
| DELETE | /tags/{id} | 删除标签 |

### Categories（同 Tags 结构）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /categories | 分类列表 |
| GET | /categories/{id} | 分类详情 |
| POST | /categories | 创建分类 |
| PUT | /categories/{id} | 更新分类 |
| DELETE | /categories/{id} | 删除分类 |

### Users
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users | 用户列表 |
| GET | /users/{id} | 用户详情 |
| POST | /users | 创建用户 |
| PUT | /users/{id} | 更新用户 |
| DELETE | /users/{id} | 删除用户 |

### Posts
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /posts | 文章列表（支持分页、按作者/分类/标签过滤） |
| GET | /posts/{id} | 文章详情（含作者/分类信息） |
| POST | /posts | 创建文章 |
| PUT | /posts/{id} | 更新文章 |
| DELETE | /posts/{id} | 删除文章 |

### Comments
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /comments?post_id=xxx | 评论列表（按文章过滤，支持分页） |
| GET | /comments/{id} | 评论详情 |
| POST | /comments | 创建评论（自动更新 post.commentCount） |
| DELETE | /comments/{id} | 删除评论（自动更新 post.commentCount） |

### Stats
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /stats/tag-cloud | 标签云（每个标签的文章数） |
| GET | /stats/author-ranking | 作者发文排行 |
| GET | /stats/category-summary | 分类统计 |
| GET | /stats/dashboard | 综合看板（总文章数、总评论数、总用户数） |

## 教学步骤

### Step 1：项目骨架 + 依赖
创建目录结构，安装 fastapi, uvicorn, pymongo, python-dotenv

### Step 2：配置管理 + 数据库连接
- config.py 从 .env 读取 MONGO_URI
- database.py 用单例模式管理 MongoDB 连接
- 启动时连接、关闭时断开

### Step 3：Pydantic Schemas
一次性定义 5 个实体的：
- CreateSchema（创建时请求体）
- UpdateSchema（更新时请求体）
- ResponseSchema（返回给客户端）
- 含字段验证（标题非空、邮箱格式等）

### Step 4：Helpers
- ObjectId → str 转换（PyObjectId 类型）
- 分页参数模型
- 统一响应格式

### Step 5：Tags 路由
完整的 CRUD，作为"样板"，后面路由都仿照这个模式。

### Step 6：Categories + Users 路由
与 Tags 结构一致，快速完成。

### Step 7：Posts 路由
涉及引用字段（authorId, categoryId, tags[]），需要：
- 创建时验证引用是否存在
- 返回时 $lookup 关联数据
- 支持查询过滤（?author_id=xxx&category_id=xxx&published=true）

### Step 8：Comments 路由
- 创建时验证 postId 是否存在
- 自动维护 post.commentCount（创建 +1，删除 -1）
- 按 post_id 过滤

### Step 9：统一错误处理
- 404 自定义异常
- 422 验证错误格式化
- 500 全局捕获

### Step 10：分页
通用分页参数（page, page_size），所有列表接口支持分页。

### Step 11：聚合统计路由
- 标签云：$unwind + $group
- 作者排行：$group + $sort
- 分类统计：$lookup + $group
- 综合看板：多个 $count

### Step 12：种子数据脚本
- 插入 5+ 用户、5+ 分类、10+ 标签、50+ 文章、200+ 评论
- 可重复执行（先清空再插入）

### Step 13：启动验证
- uvicorn 启动
- 访问 /docs 查看 Swagger
- 测试所有接口

## 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 驱动 | pymongo | Week 2 已使用，保持一致性 |
| 验证 | Pydantic v2 | FastAPI 内置，自动生成 OpenAPI |
| ObjectId 处理 | 自定义 PyObjectId | 继承 str 类型，自动序列化 |
| 连接管理 | 全局 client | 简单项目不需要连接池抽象 |
| 应用结构 | routers 模块化 | 路由按实体分文件 |

## 文件清单

| 文件 | 预计行数 | 说明 |
|------|----------|------|
| README.md | ~300 | 教学文档 |
| requirements.txt | 5 | 依赖 |
| app/__init__.py | 0 | 空 |
| app/main.py | 30 | 入口 |
| app/config.py | 15 | 配置 |
| app/database.py | 25 | 数据库连接 |
| app/schemas.py | 120 | Pydantic 模型 |
| app/helpers.py | 40 | 工具函数 |
| app/routers/__init__.py | 0 | 空 |
| app/routers/tags.py | 60 | Tags CRUD |
| app/routers/categories.py | 60 | Categories CRUD |
| app/routers/users.py | 60 | Users CRUD |
| app/routers/posts.py | 100 | Posts CRUD |
| app/routers/comments.py | 80 | Comments CRUD |
| app/routers/stats.py | 60 | 聚合统计 |
| app/seed.py | 100 | 种子数据 |
