# Week 4 阅读路线

按顺序看，看完打勾。

## 第 1 层：入口（5 分钟）

- [x] `app/main.py` — 完整项目地图：6 个 router、生命周期

## 第 2 层：基础设施（5 分钟）

- [x] `app/config.py` — 怎么读 .env
- [x] `app/database.py` — 怎么连 MongoDB
- [x] `app/helpers.py` — ObjectId 转字符串

## 第 3 层：数据模型（10 分钟）

- [x] `app/schemas.py` — 5 个实体的请求/响应长什么样

## 第 4 层：最简单的 CRUD（10 分钟）⭐

- [x] `app/routers/tags.py` — 5 个函数 = 增删改查 + 列表

看懂 tags.py，其他 router 都是同一套模式。

## 第 5 层：其他简单实体（5 分钟）

- [x] `app/routers/categories.py` — 跟 tags 一样
- [x] `app/routers/users.py` — 跟 tags 一样，多一个 createdAt

## 第 6 层：复杂的（15 分钟）

- [x] `app/routers/posts.py` — 引用 + 分页 + 过滤
- [x] `app/routers/comments.py` — 自动维护 commentCount
- [x] `app/routers/stats.py` — 聚合管道封装

## 第 7 层：数据（5 分钟）

- [x] `app/seed.py` — 种子数据怎么来的

---

## 核心规律

```
tags.py       → 标准 CRUD 样板
categories.py → 跟 tags 一样，字段不同
users.py      → 跟 tags 一样，多个 createdAt
posts.py      → tags 的变体 + 引用验证 + 分页
comments.py   → tags 的变体 + 计数器
stats.py      → 不做 CRUD，只做统计查询
```

tags.py 看懂，其他都是变体。
