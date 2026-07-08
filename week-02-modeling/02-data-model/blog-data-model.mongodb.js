use("blog");

// =============================================
// Step 2：博客数据模型定稿
// 5 个集合 + 示范数据
// =============================================

// 清空所有集合（从头来过）
db.users.drop();
db.categories.drop();
db.tags.drop();
db.posts.drop();
db.comments.drop();

// ========== 1. users ==========
db.users.insertMany([
  { username: "alice", email: "alice@example.com", createdAt: new Date() },
  { username: "bob", email: "bob@example.com", createdAt: new Date() }
]);

// ========== 2. categories ==========
db.categories.insertMany([
  { name: "技术", slug: "tech" },
  { name: "生活", slug: "life" }
]);

// ========== 3. tags ==========
db.tags.insertMany([
  { name: "MongoDB" },
  { name: "JavaScript" },
  { name: "Python" }
]);

// ========== 4. posts ==========
// 先查出引用数据
const alice = db.users.findOne({ username: "alice" });
const bob = db.users.findOne({ username: "bob" });
const tech = db.categories.findOne({ slug: "tech" });
const life = db.categories.findOne({ slug: "life" });
const tagMongo = db.tags.findOne({ name: "MongoDB" });
const tagJS = db.tags.findOne({ name: "JavaScript" });
const tagPy = db.tags.findOne({ name: "Python" });

db.posts.insertMany([
  {
    title: "MongoDB 入门",
    content: "MongoDB 是一个文档数据库...",
    excerpt: "快速上手 MongoDB",
    authorId: alice._id,
    categoryId: tech._id,
    tags: [tagMongo._id, tagJS._id],
    commentCount: 0,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "用 Python 处理数据",
    content: "Python 的数据处理很强大...",
    excerpt: "Python 入门",
    authorId: bob._id,
    categoryId: tech._id,
    tags: [tagPy._id],
    commentCount: 0,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "周末爬山记",
    content: "今天去爬山了...",
    excerpt: "周末生活",
    authorId: alice._id,
    categoryId: life._id,
    tags: [],
    commentCount: 0,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// ========== 5. comments ==========
const post1 = db.posts.findOne({ title: "MongoDB 入门" });
const post2 = db.posts.findOne({ title: "用 Python 处理数据" });

db.comments.insertMany([
  { postId: post1._id, authorId: alice._id, body: "好文章！", createdAt: new Date() },
  { postId: post1._id, authorId: bob._id, body: "学到了", createdAt: new Date() },
  { postId: post2._id, authorId: alice._id, body: "Python 确实好用", createdAt: new Date() }
]);

// 动态计算评论数并更新到文章
const count1 = db.comments.countDocuments({ postId: post1._id });
const count2 = db.comments.countDocuments({ postId: post2._id });

db.posts.updateOne({ _id: post1._id }, { $set: { commentCount: count1 } });
db.posts.updateOne({ _id: post2._id }, { $set: { commentCount: count2 } });

// ========== 验证数据 ==========
print("========== 博客数据模型验证 ==========");
print("用户数:", db.users.countDocuments());
print("分类数:", db.categories.countDocuments());
print("标签数:", db.tags.countDocuments());
print("文章数:", db.posts.countDocuments());
print("评论数:", db.comments.countDocuments());

print("\n===== 文章列表 =====");
db.posts.find().forEach(p => {
  const author = db.users.findOne({ _id: p.authorId });
  const cat = db.categories.findOne({ _id: p.categoryId });
  print("《" + p.title + "》 作者:" + author.username + " 分类:" + cat.name + " 评论数:" + p.commentCount);
});
