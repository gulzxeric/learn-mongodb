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
