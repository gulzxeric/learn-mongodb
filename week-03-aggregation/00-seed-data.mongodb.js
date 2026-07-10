use("blog");

// =============================================
// 第 3 周：种子数据（让统计结果更丰富）
// 先跑这个，再跑其他练习
// =============================================

// 先查出已有的引用数据
const alice = db.users.findOne({ username: "alice" });
const bob = db.users.findOne({ username: "bob" });
const tech = db.categories.findOne({ slug: "tech" });
const life = db.categories.findOne({ slug: "life" });
const tagMongo = db.tags.findOne({ name: "MongoDB" });
const tagJS = db.tags.findOne({ name: "JavaScript" });
const tagPy = db.tags.findOne({ name: "Python" });

if (!alice || !bob || !tech || !life) {
  print("❌ 请先运行 week-02-modeling/02-data-model/blog-data-model.mongodb.js");
}

// 插入更多文章
print("===== 插入更多文章和评论 =====");

const morePosts = [
  { title: "MongoDB 聚合管道详解", content: "aggregate() 是 MongoDB 最强大的查询工具，本文详细讲解每个 stage...", excerpt: "聚合管道入门", authorId: alice._id, categoryId: tech._id, tags: [tagMongo._id, tagJS._id], commentCount: 0, published: true, createdAt: new Date("2026-06-20"), updatedAt: new Date("2026-06-20") },
  { title: "JavaScript 异步编程", content: "Promise、async/await 是 JS 异步编程的核心...", excerpt: "异步编程", authorId: alice._id, categoryId: tech._id, tags: [tagJS._id], commentCount: 0, published: true, createdAt: new Date("2026-06-18"), updatedAt: new Date("2026-06-18") },
  { title: "Python 爬虫入门", content: "用 Python 写爬虫抓取网页数据...", excerpt: "爬虫教程", authorId: bob._id, categoryId: tech._id, tags: [tagPy._id], commentCount: 0, published: true, createdAt: new Date("2026-06-15"), updatedAt: new Date("2026-06-15") },
  { title: "周末美食推荐", content: "推荐几家好吃的餐厅...", excerpt: "美食", authorId: bob._id, categoryId: life._id, tags: [], commentCount: 0, published: true, createdAt: new Date("2026-06-10"), updatedAt: new Date("2026-06-10") },
  { title: "MongoDB 索引优化实战", content: "如何给 MongoDB 查询建合适的索引...", excerpt: "索引优化", authorId: alice._id, categoryId: tech._id, tags: [tagMongo._id], commentCount: 0, published: true, createdAt: new Date("2026-06-08"), updatedAt: new Date("2026-06-08") },
  { title: "运动打卡第 30 天", content: "坚持跑步 30 天，身体变化很大...", excerpt: "运动记录", authorId: alice._id, categoryId: life._id, tags: [], commentCount: 0, published: true, createdAt: new Date("2026-06-05"), updatedAt: new Date("2026-06-05") },
];

morePosts.forEach(p => {
  db.posts.insertOne(p);
  print(`  ✅ 《${p.title}》`);
});

// 插入更多评论
const allPosts = db.posts.find().toArray();

const moreComments = [
  { postId: allPosts.find(p => p.title === "MongoDB 聚合管道详解")._id, authorId: bob._id, body: "写得很清楚", createdAt: new Date("2026-06-21") },
  { postId: allPosts.find(p => p.title === "MongoDB 聚合管道详解")._id, authorId: alice._id, body: "谢谢支持", createdAt: new Date("2026-06-21") },
  { postId: allPosts.find(p => p.title === "JavaScript 异步编程")._id, authorId: bob._id, body: "async/await 这段讲得好", createdAt: new Date("2026-06-19") },
  { postId: allPosts.find(p => p.title === "Python 爬虫入门")._id, authorId: alice._id, body: "我也在学爬虫", createdAt: new Date("2026-06-16") },
  { postId: allPosts.find(p => p.title === "Python 爬虫入门")._id, authorId: bob._id, body: "可以一起交流", createdAt: new Date("2026-06-16") },
  { postId: allPosts.find(p => p.title === "周末美食推荐")._id, authorId: alice._id, body: "求地址", createdAt: new Date("2026-06-11") },
  { postId: allPosts.find(p => p.title === "MongoDB 索引优化实战")._id, authorId: bob._id, body: "很实用", createdAt: new Date("2026-06-09") },
  { postId: allPosts.find(p => p.title === "MongoDB 索引优化实战")._id, authorId: alice._id, body: "后续还有更多", createdAt: new Date("2026-06-09") },
  { postId: allPosts.find(p => p.title === "运动打卡第 30 天")._id, authorId: bob._id, body: "厉害！", createdAt: new Date("2026-06-06") },
];

moreComments.forEach(c => {
  db.comments.insertOne(c);
});

// 更新评论数
allPosts.forEach(p => {
  const count = db.comments.countDocuments({ postId: p._id });
  db.posts.updateOne({ _id: p._id }, { $set: { commentCount: count } });
});

print("\n===== 种子数据完成 =====");
print(`posts: ${db.posts.countDocuments()}`);
print(`comments: ${db.comments.countDocuments()}`);
