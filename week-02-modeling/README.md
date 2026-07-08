# 第 2 周：文档建模

## 目录结构

```
week-02-modeling/
├── 01-schema-design.md                    ← 原始教程文档
├── mongosh-test.mongodb.js                ← 练习文件
├── cheatsheet/                            ← mongosh 指令速查
├── 01-embed-vs-reference/                 ← Step 1：嵌入 vs 引用
├── 02-data-model/                         ← Step 2：博客数据模型
├── 03-queries/                            ← Step 3-4：引用查询 + $lookup
├── 04-indexes/                            ← Step 5：索引
└── 05-python/                             ← Step 6：Python pymongo
```

---

## Step 1：嵌入 vs 引用

### 嵌入（Embedded）

数据直接写在父文档里，一次查询拿到所有。

```javascript
db.posts.insertOne({
  title: "MongoDB 入门",
  comments: [
    { body: "好文章！", author: "alice" },
    { body: "学习了", author: "bob" }
  ]
})
// 查文章，评论自动带出来
db.posts.findOne({ title: "MongoDB 入门" })
```

| 优点 | 缺点 |
|------|------|
| 一次查询全部拿到 | 文档有 16MB 限制 |
| 原子更新 | 不能单独查子数据 |
| 数据局部性好 | 数组无限增长有风险 |

### 引用（Referenced）

数据分开存，用 `_id` 关联。

```javascript
db.posts.insertOne({ _id: ObjectId(), title: "MongoDB 入门" })
db.comments.insertOne({ postId: ObjectId("..."), body: "好文章！" })

// 需要两次查询
const post = db.posts.findOne({ title: "MongoDB 入门" })
const comments = db.comments.find({ postId: post._id })
```

| 优点 | 缺点 |
|------|------|
| 数据量无上限 | 需要两次查询 |
| 可独立查询/分页 | 更新可能要改多个集合 |

### 决策树

```
子数据会无限增长？
  ├── 是 → 引用
  └── 否 → 需要独立查询？
              ├── 是 → 引用
              └── 否 → 嵌入
```

---

## Step 2：博客数据模型

5 个集合，引用关系：

```
users:      { _id, username, email, createdAt }
categories: { _id, name, slug }
tags:       { _id, name }
posts:      { _id, title, content, authorId, categoryId, tags: [tagId], commentCount, ... }
comments:   { _id, postId, authorId, body, createdAt }
```

运行 `02-data-model/blog-data-model.mongodb.js` 初始化数据。

---

## Step 3：引用关系查询

### 1:N（用户↔文章）

```javascript
const alice = db.users.findOne({ username: "alice" })
db.posts.find({ authorId: alice._id })
```

### N:M（文章↔标签）

```javascript
// 文章→标签：正向
const post = db.posts.findOne({ title: "MongoDB 入门" })
post.tags.forEach(id => db.tags.findOne({ _id: id }))

// 标签→文章：反向
const tag = db.tags.findOne({ name: "MongoDB" })
db.posts.find({ tags: tag._id })
```

---

## Step 4：$lookup（MongoDB 的 JOIN）

一次聚合拿到关联数据，代替手动查多次：

```javascript
db.posts.aggregate([
  {
    $lookup: {
      from: "users",          // 关联哪个集合
      localField: "authorId", // 当前集合的字段
      foreignField: "_id",    // 关联集合的字段
      as: "author"            // 结果存放字段（数组）
    }
  }
])
```

关键点：
- `as` 始终是**数组**（即使只有一条匹配）
- 取值：`result[0]` 或 `$addFields` + `$arrayElemAt` 转对象
- 数组字段（如 `tags: [tagId]`）可以直接关联
- 多个 `$lookup` 可以**链式调用**

**设计原则**：优先嵌入 → 嵌入不了用引用 → 引用后用 `$lookup` 拼数据

---

## Step 5：索引

索引 = 书的目录，让查询更快。

### 类型

| 类型 | 命令 |
|------|------|
| 单字段 | `db.posts.createIndex({ authorId: 1 })` |
| 复合 | `db.posts.createIndex({ authorId: 1, createdAt: -1 })` |
| 唯一 | `db.users.createIndex({ username: 1 }, { unique: true })` |

### 怎么看是否走了索引

```javascript
db.posts.find({ authorId: ObjectId("...") }).explain("executionStats")
// COLLSCAN → 全表扫描（没走索引）
// IXSCAN → 索引扫描（走了索引）
```

### 核心要点

- 索引是**自动使用**的，建好后 `find()` 会自动走
- 不加索引 = 全表扫描，数据量越大越慢
- 索引有代价：写入变慢、占磁盘空间
- 不是越多越好，给**查询条件**建索引即可

---

## Step 6：Python pymongo

安装：`pip install pymongo python-dotenv`

连接串存在 `.env`（已加入 `.gitignore`）：

```
MONGO_URI=mongodb+srv://用户:密码@cluster0.n07y6rd.mongodb.net/
```

### 操作对照

| 操作 | mongosh | pymongo |
|------|---------|---------|
| 查 | `find()` | `find()` |
| 插入 | `insertOne()` | `insert_one()` |
| 更新 | `updateOne()` | `update_one()` |
| 删除 | `deleteOne()` | `delete_one()` |
| 聚合 | `aggregate()` | `aggregate()` |
| 建索引 | `createIndex()` | `create_index()` |
| 看索引 | `getIndexes()` | `list_indexes()` |

**规律**：驼峰式 → 蛇形式（`insertOne` → `insert_one`），其他完全一样。

---

## 文件执行顺序

```
1. cheatsheet/mongosh-cheatsheet.mongodb.js     ← 指令速查测试
2. 01-embed-vs-reference/embedded-vs-referenced.mongodb.js  ← 嵌入/引用入门
3. 01-embed-vs-reference/exercise-embedded.mongodb.js       ← 嵌入练习
4. 01-embed-vs-reference/exercise-referenced.mongodb.js     ← 引用练习
5. 02-data-model/blog-data-model.mongodb.js     ← 初始化博客数据
6. 03-queries/step3-referenced-queries.mongodb.js           ← 引用关系查询
7. 03-queries/step4-lookup.mongodb.js           ← $lookup 入门
8. 03-queries/step4-lookup-deepdive.mongodb.js  ← $lookup 深度讲解
9. 04-indexes/step5-indexes.mongodb.js          ← 索引实操
10. 04-indexes/step5-index-explained.mongodb.js ← 索引原理深度讲解
11. 05-python/step6-pymongo.py                  ← Python 操作
```
