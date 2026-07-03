# 第 1 周：CRUD 基础 (mongosh)

## SQL vs MongoDB 对照

| SQL | MongoDB |
|-----|---------|
| DATABASE | DATABASE |
| TABLE | COLLECTION |
| ROW | DOCUMENT |
| PRIMARY KEY | \_id |
| JOIN | $lookup / 嵌入 |

## 数据库操作

```javascript
show dbs                  // 列出所有数据库
use blog                  // 切换到 blog 库（不存在则创建）
db                        // 显示当前数据库
db.dropDatabase()         // 删除当前数据库
```

## 集合操作

```javascript
show collections          // 列出当前库所有集合
db.createCollection("logs") // 创建集合
db.logs.drop()            // 删除集合
```

## 插入

```javascript
// 单条
db.users.insertOne({ username: "alice", email: "alice@example.com" })

// 多条
db.users.insertMany([
  { username: "bob", email: "bob@example.com" },
  { username: "charlie", email: "charlie@example.com" }
])
```

| SQL | MongoDB |
|-----|---------|
| INSERT INTO users VALUES (...)| insertOne({...}) |
| INSERT INTO users VALUES (...),(...)| insertMany([{...},{...}]) |

## 查询

```javascript
// 查所有
db.users.find()

// 查单条
db.users.findOne({ username: "alice" })

// 条件查询
db.users.find({ email: "alice@example.com" })
```

| SQL | MongoDB |
|-----|---------|
| SELECT * FROM users | find() |
| SELECT * FROM users WHERE username='alice' | find({ username: "alice" }) |
| SELECT * FROM users LIMIT 1 | findOne() |

## 更新

```javascript
// 更新匹配的第一条
db.users.updateOne(
  { username: "bob" },
  { $set: { email: "bob_new@example.com" } }
)

// 替换整个文档
db.users.replaceOne(
  { username: "bob" },
  { username: "bob", email: "bob@example.com" }
)
```

| 操作符 | 作用 | SQL 类比 |
|--------|------|----------|
| `$set` | 设置字段值 | SET column = value |
| `$inc` | 自增/减 | SET count = count + 1 |

| SQL | MongoDB |
|-----|---------|
| UPDATE users SET email='x' WHERE username='bob' | updateOne({filter}, {$set: {...}}) |
| — | replaceOne({filter}, newDoc) |

## 删除

```javascript
// 删除匹配的第一条
db.users.deleteOne({ username: "bob" })

// 删除所有匹配
db.users.deleteMany({ email: "old@example.com" })
```

| SQL | MongoDB |
|-----|---------|
| DELETE FROM users WHERE username='bob' | deleteOne({ username: "bob" }) |
| DELETE FROM users WHERE email='x' | deleteMany({ email: "x" }) |

## 比较操作符

```javascript
// $gt 大于
db.posts.find({ commentCount: { $gt: 5 } })

// $gte 大于等于
db.posts.find({ commentCount: { $gte: 1 } })

// $lt 小于
db.posts.find({ commentCount: { $lt: 10 } })

// $ne 不等于
db.posts.find({ commentCount: { $ne: 0 } })

// $in 在列表中
db.posts.find({ authorId: { $in: [ObjectId("..."), ObjectId("...")] } })
```

| SQL | MongoDB |
|-----|---------|
| WHERE comment_count > 5 | { commentCount: { $gt: 5 } } |
| WHERE comment_count >= 1 | { commentCount: { $gte: 1 } } |
| WHERE comment_count < 10 | { commentCount: { $lt: 10 } } |
| WHERE comment_count != 0 | { commentCount: { $ne: 0 } } |
| WHERE id IN (1, 2) | { \_id: { $in: [id1, id2] } } |

## 逻辑操作符

```javascript
// $and — 同时满足
db.posts.find({ $and: [{ published: true }, { commentCount: { $gt: 0 } }] })

// $or — 满足其一
db.posts.find({ $or: [{ title: "MongoDB" }, { content: "MongoDB" }] })
```

| SQL | MongoDB |
|-----|---------|
| WHERE a AND b | { $and: [a, b] } |
| WHERE a OR b | { $or: [a, b] } |

## 排序与分页

```javascript
// 排序: 1 升序, -1 降序
db.posts.find().sort({ createdAt: -1 })

// 限制条数
db.posts.find().limit(5)

// 跳过（分页用）
db.posts.find().skip(0).limit(10)   // 第 1 页
db.posts.find().skip(10).limit(10)  // 第 2 页

// 链式使用
db.posts.find({ published: true }).sort({ createdAt: -1 }).limit(10)
```

| SQL | MongoDB |
|-----|---------|
| ORDER BY created_at DESC | sort({ createdAt: -1 }) |
| LIMIT 10 | limit(10) |
| OFFSET 10 | skip(10) |

## 投影（只返回指定字段）

```javascript
// 1 包含, 0 排除（_id 默认包含）
db.users.find({}, { username: 1, email: 1, _id: 0 })
```

| SQL | MongoDB |
|-----|---------|
| SELECT username, email FROM users | find({}, { username: 1, email: 1, _id: 0 }) |
