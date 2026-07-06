use("blog");

// =============================================
// 练习 2：引用模式
// 分类-文章 的引用关系
// =============================================

// 清空集合
db.categories.drop();
db.posts.drop();

// 1. 插入一个分类
db.categories.insertOne({
  _id: ObjectId("650000000000000000000010"),
  name: "技术",
  slug: "tech"
});

// 2. 插入 2 篇文章，用 categoryId 引用上面的分类
db.posts.insertOne({
  title: "what is LLM",
  content: "LLM 是大语言模型...",
  categoryId: ObjectId("650000000000000000000010"),
  createdAt: new Date()
});

db.posts.insertOne({
  title: "how to write a blog",
  content: "写博客的步骤...",
  categoryId: ObjectId("650000000000000000000010"),
  createdAt: new Date()
});

// 3. 查分类
const cat = db.categories.findOne({ _id: ObjectId("650000000000000000000010") });
print("分类:", cat.name);

// 4. 查该分类下的所有文章（需要第二次查询）
const posts = db.posts.find({ categoryId: ObjectId("650000000000000000000010") }).toArray();
print("文章数量:", posts.length);
posts.forEach(p => print(" -", p.title));
