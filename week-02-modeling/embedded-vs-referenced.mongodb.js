use("blog");

// =============================================
// 模式一：嵌入（Embedded）
// 评论直接写在文章文档里
// =============================================
print("========== 嵌入模式 ==========");

// 先删除测试数据（从头来过）
db.posts.drop();
db.comments.drop();

// 插入一篇带内嵌评论的文章
db.posts.insertOne({
  _id: ObjectId("650000000000000000000001"),
  title: "MongoDB 入门",
  content: "MongoDB 是一个文档数据库...",
  tags: ["database", "nosql"],
  comments: [
    { body: "好文章！", author: "alice", createdAt: new Date() },
    { body: "学习了", author: "bob", createdAt: new Date() }
  ]
});

// 查文章——评论自动带出来
const embeddedPost = db.posts.findOne({ _id: ObjectId("650000000000000000000001") });
print("文章标题:", embeddedPost.title);

// 评论就在文章里面，不用再查一次
print("post:", embeddedPost);
print("评论数量:", embeddedPost.comments.length);
embeddedPost.comments.forEach(c => print(" -", c.author, ":", c.body));


// =============================================
// 模式二：引用（Referenced）
// 文章和评论分开存放，用 postId 关联
// =============================================
print("\n========== 引用模式 ==========");

// 删除测试数据
db.posts.drop();
db.comments.drop();

// 插入一篇文章
db.posts.insertOne({
  _id: ObjectId("650000000000000000000002"),
  title: "引用模式详解",
  content: "引用模式把数据分开存放..."
});

// 插入两条评论，用 postId 引用文章
db.comments.insertOne({
  postId: ObjectId("650000000000000000000002"),
  author: "alice",
  body: "原来如此",
  createdAt: new Date()
});
db.comments.insertOne({
  postId: ObjectId("650000000000000000000002"),
  author: "bob",
  body: "明白了",
  createdAt: new Date()
});

// 查文章——评论不会自动带出来
const refPost = db.posts.findOne({ _id: ObjectId("650000000000000000000002") });
print("文章标题:", refPost.title);

// 评论需要单独查
const refComments = db.comments.find({ postId: ObjectId("650000000000000000000002") }).toArray();
print("post:", refPost);
print("post comments:", refComments);
print("评论数量:", refComments.length);
refComments.forEach(c => print(" -", c.author, ":", c.body));


// =============================================
// 对比总结
// =============================================
print("\n========== 对比总结 ==========");
print("嵌入模式：一次查询拿到文章+评论");
print("引用模式：需要两次查询才能拿到文章和评论");
print("嵌入适合数据量小且稳定的场景");
print("引用适合数据量大或需要独立查询的场景");
