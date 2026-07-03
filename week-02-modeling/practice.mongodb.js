use("blog");

// 插入一篇文章（引用方式）
const postId = new ObjectId();
db.posts.insertOne({
  _id: postId,
  title: "嵌入 vs 引用",
  content: "今天学习 MongoDB 的文档建模...",
  commentCount: 0,
  createdAt: new Date()
});
print("文章 ID:", postId);

// 插入一条评论，引用上面那篇文章
db.comments.insertOne({
  postId: postId,
  author: "alice",
  body: "讲得很清楚",
  createdAt: new Date()
});

// 查文章和它的评论
const post = db.posts.findOne({ _id: postId }); 
const comments = db.comments.find({ postId: postId }).toArray();
print("文章:", post.title);
print("评论数:", comments.length);
comments.forEach(c => print(" -", c.author, ":", c.body));
