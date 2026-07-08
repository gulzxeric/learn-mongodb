// ============================
// mongosh 指令速查
// ============================

use("blog");

// ---------- 数据库 ----------
show("dbs")              // 列出所有数据库
db                       // 查看当前数据库名

// ---------- 集合 ----------
show("collections")      // 列出当前库所有集合
db.createCollection("logs")  // 创建集合（也可以直接 insert，会自动创建）
db.logs.drop()           // 删除集合

// ---------- 插入 ----------
// 单条
db.users.insertOne({ username: "alice", email: "alice@example.com" })

// 多条
db.users.insertMany([
  { username: "bob", email: "bob@example.com" },
  { username: "charlie", email: "charlie@example.com" }
])

// ---------- 查询 ----------
db.users.find()                          // 查所有
db.users.findOne({ username: "alice" })  // 查单条
db.users.find({ email: "alice@example.com" })  // 条件查

// 排序: 1 升序, -1 降序
db.posts.find().sort({ createdAt: -1 })

// 限制条数
db.posts.find().limit(5)

// 跳过（分页用）
db.posts.find().skip(0).limit(10)

// 链式组合
db.posts.find({ published: true }).sort({ createdAt: -1 }).limit(10)

// 投影（只返回指定字段，1=包含，0=排除，_id默认包含）
db.users.find({}, { username: 1, email: 1, _id: 0 })

// ---------- 更新 ----------
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

// ---------- 删除 ----------
db.users.deleteOne({ username: "bob" })
db.users.deleteMany({ email: "old@example.com" })

// ---------- 比较操作符 ----------
db.posts.find({ commentCount: { $gt: 5 } })   // 大于
db.posts.find({ commentCount: { $gte: 1 } })  // 大于等于
db.posts.find({ commentCount: { $lt: 10 } })  // 小于
db.posts.find({ commentCount: { $ne: 0 } })   // 不等于
db.posts.find({ authorId: { $in: [ObjectId("..."), ObjectId("...")] } })  // 在列表中

// ---------- 逻辑操作符 ----------
db.posts.find({ $and: [{ published: true }, { commentCount: { $gt: 0 } }] })
db.posts.find({ $or: [{ title: "MongoDB" }, { content: "MongoDB" }] })

// ---------- 有用的辅助 ----------
// 查看文档数量
db.users.countDocuments()

// 清空集合
db.users.deleteMany({})

// 删除集合后再建（更快清空）
db.users.drop()
