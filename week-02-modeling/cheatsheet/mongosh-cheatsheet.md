# mongosh 指令速查

## 数据库

| 指令 | 说明 |
|------|------|
| `show dbs` | 列出所有数据库 |
| `use blog` | 切换到 blog 库（不存在则创建） |
| `db` | 显示当前数据库 |
| `db.dropDatabase()` | 删除当前数据库 |

## 集合

| 指令 | 说明 |
|------|------|
| `show collections` | 列出当前库所有集合 |
| `db.createCollection("logs")` | 创建集合 |
| `db.logs.drop()` | 删除集合 |
| `db.logs.deleteMany({})` | 清空集合 |

## 插入

| 指令 | 说明 |
|------|------|
| `db.users.insertOne({...})` | 插入单条文档 |
| `db.users.insertMany([{...},{...}])` | 插入多条文档 |

## 查询

| 指令 | 说明 |
|------|------|
| `db.users.find()` | 查所有 |
| `db.users.findOne({filter})` | 查单条 |
| `db.users.find({filter})` | 条件查询 |

## 更新

| 指令 | 说明 |
|------|------|
| `db.users.updateOne({filter}, {$set: {field: value}})` | 更新匹配的第一条 |
| `db.users.replaceOne({filter}, newDoc)` | 替换整个文档 |

## 删除

| 指令 | 说明 |
|------|------|
| `db.users.deleteOne({filter})` | 删除匹配的第一条 |
| `db.users.deleteMany({filter})` | 删除所有匹配 |

## 比较操作符

| 操作符 | 含义 | 用法 |
|--------|------|------|
| `$gt` | 大于 | `{ count: { $gt: 5 } }` |
| `$gte` | 大于等于 | `{ count: { $gte: 1 } }` |
| `$lt` | 小于 | `{ count: { $lt: 10 } }` |
| `$ne` | 不等于 | `{ count: { $ne: 0 } }` |
| `$in` | 在列表中 | `{ _id: { $in: [id1, id2] } }` |

## 逻辑操作符

| 操作符 | 含义 | 用法 |
|--------|------|------|
| `$and` | 并且 | `{ $and: [{a}, {b}] }` |
| `$or` | 或者 | `{ $or: [{a}, {b}] }` |

## 排序与分页

| 指令 | 说明 |
|------|------|
| `.sort({ createdAt: -1 })` | 排序（1升序 / -1降序） |
| `.limit(5)` | 限制条数 |
| `.skip(10)` | 跳过（分页用） |

链式使用：`db.posts.find({published: true}).sort({createdAt: -1}).limit(10)`

## 投影

| 指令 | 说明 |
|------|------|
| `db.users.find({}, { username: 1, email: 1, _id: 0 })` | 只返回指定字段（1=包含，0=排除） |

## 辅助查询

| 指令 | 说明 |
|------|------|
| `db.users.countDocuments()` | 统计文档数量 |

## mongosh 常用函数

| 函数 | 说明 |
|------|------|
| `print("hello")` | 打印文本 |
| `printjson({a: 1})` | 打印格式化的 JSON |
| `ObjectId()` | 创建新 ObjectId |
| `new Date()` | 当前时间 |
| `ISODate("2026-07-08")` | 创建指定日期 |
