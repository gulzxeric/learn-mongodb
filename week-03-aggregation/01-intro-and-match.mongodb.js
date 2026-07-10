use("blog");

// =============================================
// 第 3 周：聚合管道入门
// Stage 1: $match + $sort + $project
// =============================================

// 先确保有数据
const count = db.posts.countDocuments();
if (count < 3) {
  print("❌ 请先运行 week-02-modeling/02-data-model/blog-data-model.mongodb.js");
}

// ===== 聚合管道是什么？ =====
// .find() 只能做简单查询
// .aggregate() 把多个步骤串起来，每个步骤的输出是下一步的输入
//
// db.posts.aggregate([
//   { $match: { ... } },    // 过滤（类似 WHERE）
//   { $sort: { ... } },     // 排序（类似 ORDER BY）
//   { $project: { ... } },  // 选字段（类似 SELECT）
// ])


// ===== 1. $match = WHERE =====
print("===== 1. $match：过滤 =====");
print("--- published: true 的文章 ---");
db.posts.aggregate([
  { $match: { published: true } }
]).forEach(p => print(`  《${p.title}》， ${p.published}`));

print("--- published: true & bob 的文章 ---");
const bob = db.users.findOne({ username: "bob" })
db.posts.aggregate([
  { $match: { published: true, authorId: bob._id } }
]).forEach(p => print(`  《${p.title}》， ${p.authorId}`));


// ===== 2. $sort = ORDER BY =====
print("\n===== 2. $sort：排序 =====");
print("--- 按创建时间倒序 ---");
db.posts.aggregate([
  { $sort: { createdAt: -1 } }
]).forEach(p => print(`  《${p.title}》 ${p.createdAt}`));



print("--- 按評論數量排序 ---");
db.posts.aggregate([
  { $match: { authorId: bob._id } },
  { $sort: { commentCount: 1 } }
]).forEach(p => print(`  《${p.title}》 ${bob.username} ${p.commentCount}`));


// ===== 3. $project = SELECT 指定字段 =====
print("\n===== 3. $project：投影 =====");
print("--- 只返回 title 和 commentCount ---");
db.posts.aggregate([
  { $project: { title: 1, commentCount: 1, _id: 0 } }
]).forEach(p => print(`  《${p.title}》 评论:${p.commentCount}`));


// ===== 4. 组合使用 =====
print("\n===== 4. 组合：已发布文章按时间倒序，只看标题 =====");
db.posts.aggregate([
  { $match: { published: true } },
  { $sort: { createdAt: -1 } },
  { $project: { title: 1, _id: 0 } }
]).forEach(p => print(`  《${p.title}》`));


// ===== 5. $project 还能创建新字段 =====
print("\n===== 5. $project：创建新字段 =====");
print("--- 计算 excerpt 长度 ---");
db.posts.aggregate([
  { $match: { published: true } },
  {
    $project: {
      title: 1,
      excerptLength: { $strLenCP: "$excerpt" },
      _id: 0
    }
  }
]).forEach(p => print(`  《${p.title}》 摘要长度:${p.excerptLength}`));


// ===== 对比 find() 和 aggregate() =====
print("\n===== 对比 =====");
print("  find() 只能做 过滤 + 排序 + 投影");
print("  aggregate() 可以 chain 无限个 stage");
print("  简单查询用 find()，复杂统计用 aggregate()");
