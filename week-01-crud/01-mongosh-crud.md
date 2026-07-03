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
