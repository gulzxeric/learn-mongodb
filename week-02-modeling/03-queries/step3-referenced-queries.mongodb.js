use("blog");

// =============================================
// Step 3：引用关系查询实操
// 前提：blog-data-model.mongodb.js 已跑过
// =============================================

// ===== 1:N 用户↔文章 =====
print("========== 1:N 用户↔文章 ==========");

// 查 alice 写了哪些文章
const alice = db.users.findOne({ username: "alice" });
const alicePosts = db.posts.find({ authorId: alice._id }).toArray();

print("作者:", alice.username);
print("文章数:", alicePosts.length);
alicePosts.forEach(p => print(`《${p.title}》`));


// ===== N:M 文章↔标签 =====
print("\n========== N:M 文章↔标签 ==========");

// 查 "MongoDB 入门" 用了哪些标签
const post = db.posts.findOne({ title: "MongoDB 入门" });
print(`文章：《${post.title}》的标签`);

post.tags.forEach(tagId => {
  const tag = db.tags.findOne({ _id: tagId });
  print(" - " + tag.name);
});

// 反过来：查 "MongoDB" 标签被哪些文章用了
const tagMongo = db.tags.findOne({ name: "MongoDB" });
const taggedPosts = db.posts.find({ tags: tagMongo._id }).toArray();

print(`\n标签【${tagMongo.name}】被以下文章使用:`)
taggedPosts.forEach(p => print(`- 《${p.title}》`));


// ===== 1:N 文章↔评论 =====
print("\n========== 1:N 文章↔评论 ==========");

const post1 = db.posts.findOne({ title: "MongoDB 入门" });
const comments = db.comments.find({ postId: post1._id }).toArray();

print(`文章《${post1.title}》的评论：`);
comments.forEach(c => {
  const author = db.users.findOne({ _id: c.authorId });
  print(" - " + author.username + ": " + c.body);
});


/* 
练习 1 — 在 mongosh 里手写查询（不用新建文件，直接命令行敲）：
1. 查 bob 写了哪些文章
2. 查"生活"分类下有哪几篇文章 
*/
const bob = db.users.findOne({ username: 'bob' })
const bobPosts = db.posts.find({ authorId: bob._id }).toArray()

print(`作者：\n${bob.username}`)
print(`文章数量：\n${bobPosts.length}`)
bobPosts.forEach(p => print(`- 《${p.title}》\n`))

const life = db.categories.findOne({ name: '生活' })
const lifeTaggedPosts = db.posts.find({ categoryId: life._id }).toArray()

print(`\n【${life.name}】分类下有这些文章:`)
lifeTaggedPosts.forEach(p => print(`- 《${p.title}》`))

/* 
练习 2 — 新建 exercise-step3.mongodb.js：
1. 查标签 "JavaScript" 被哪些文章使用了
2. 查文章 "周末爬山记" 有没有评论
3. 打印结果
*/

const tagJavaScript = db.tags.findOne({ name: "JavaScript" });
const JStaggedPosts = db.posts.find({ tags: tagJavaScript._id }).toArray();

print(`\n标签【${tagJavaScript.name}】被以下文章使用:`)
JStaggedPosts.forEach(p => print(`- 《${p.title}》`));

const climbPost = db.posts.findOne({title: "周末爬山记"})
const climbComments = db.comments.find({postId: climbPost._id}).toArray()
print("评论数:", climbComments.length)
climbComments.forEach(c => print(" -", c.body))