# 第 2 周：文档建模

## 嵌入 vs 引用

MongoDB 有两种方式处理数据关系。

### 嵌入（Embedded）

数据直接写在父文档里，一个查询就能拿到全部数据：

```javascript
// 文章里直接内嵌评论
db.posts.insertOne({
  title: "MongoDB 入门",
  content: "MongoDB 是一个 NoSQL 数据库...",
  comments: [
    { body: "好文章！", author: "alice", createdAt: new Date() },
    { body: "学习了", author: "bob", createdAt: new Date() }
  ]
})

// 查询文章，评论自带
db.posts.findOne({ title: "MongoDB 入门" })
```

| 优点 | 缺点 |
|------|------|
| 一次查询拿到所有数据 | 文档有大小限制（16MB） |
| 原子更新（整篇文档一起写） | 无法单独查询评论 |
| 数据局部性好 | 数组无限增长有风险 |

**适合场景：**
- 子数据量小且稳定（如地址、标签）
- 总是和父文档一起读
- 需要原子性更新

### 引用（Referenced）

数据分开存放，用 ID 关联：

```javascript
// posts 集合
db.posts.insertOne({
  _id: ObjectId("..."),
  title: "MongoDB 入门",
  authorId: ObjectId("..."),
  commentCount: 0
})

// comments 集合
db.comments.insertOne({
  postId: ObjectId("..."),    // 引用文章
  author: "alice",
  body: "好文章！",
  createdAt: new Date()
})

// 查询评论
db.comments.find({ postId: ObjectId("...") })
```

| 优点 | 缺点 |
|------|------|
| 数据无大小限制 | 需要两次查询或 $lookup |
| 可以独立查询和分页 | 更新需要操作多个集合 |
| 避免数据重复 | — |

**适合场景：**
- 子数据量可能很大（如评论、日志）
- 子文档需要独立查询和分页
- 子文档被多个父文档复用

### 决策原则

```
问题：数据会无限增长吗？
  ├── 是 → 引用
  └── 否 → 问题：是否需要独立查询？
              ├── 是 → 引用
              └── 否 → 嵌入
```

## SQL vs MongoDB 关系对照

| SQL 关系 | 例子 | MongoDB 方案 |
|-----------|------|-------------|
| 1:1 | 用户 ↔ 个人资料 | 嵌入或同一文档 |
| 1:N | 用户 ↔ 文章 | 引用（文章存 authorId） |
| N:M | 文章 ↔ 标签 | 引用数组（文章存 tags: [tagId]） |

## 博客数据模型（本项目用引用方式）

```
users:      { _id, username, email, createdAt }
categories: { _id, name, slug }
tags:       { _id, name }
posts:      { _id, title, content, excerpt, authorId, categoryId, tags: [tagId], commentCount, published, createdAt, updatedAt }
comments:   { _id, postId, authorId, body, createdAt }
```

## $lookup — MongoDB 的 JOIN

引用方式存的数据，怎么把关联的查出来？

```javascript
// 查文章+作者（类似 SQL: SELECT * FROM posts JOIN users ON posts.authorId = users._id）
db.posts.aggregate([
  {
    $lookup: {
      from: "users",                 // 要关联的集合
      localField: "authorId",        // 当前集合的字段
      foreignField: "_id",           // 目标集合的字段
      as: "author"                   // 结果放到这个字段
    }
  }
])
```

```sql
-- SQL 等效
SELECT * FROM posts JOIN users ON posts.authorId = users.id
```

## 索引

索引加速查询，类似 SQL 的 INDEX。

```javascript
// 单字段索引
db.posts.createIndex({ authorId: 1 })        // 加速按作者查
db.posts.createIndex({ createdAt: -1 })      // 加速排序

// 复合索引（多个字段组合）
db.posts.createIndex({ authorId: 1, createdAt: -1 })

// 查看查询是否走了索引
db.posts.find({ authorId: ObjectId("...") }).explain("executionStats")
```

```sql
-- SQL 等效
CREATE INDEX idx_author ON posts(author_id)
CREATE INDEX idx_author_created ON posts(author_id, created_at)
```

## Python 操作

```python
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

client = MongoClient("mongodb+srv://<用户名>:<密码>@cluster0.n07y6rd.mongodb.net/")
db = client["blog"]
posts = db["posts"]

# 插入
post_id = posts.insert_one({
    "title": "用 Python 操作 MongoDB",
    "content": "今天是第二周...",
    "authorId": ObjectId("650000000000000000000001"),
    "commentCount": 0,
    "createdAt": datetime.utcnow()
}).inserted_id

# 查询
for post in posts.find().sort("createdAt", -1).limit(5):
    print(post["title"], post["commentCount"])

client.close()
```
