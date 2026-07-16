import { ObjectId } from "mongodb";
import { connectDb, getDb, closeDb } from "./db.js";

async function seed() {
  await connectDb();
  const db = getDb();

  await db.collection("users").drop();
  await db.collection("categories").drop();
  await db.collection("tags").drop();
  await db.collection("posts").drop();
  await db.collection("comments").drop();

  const userDocs = [
    { _id: new ObjectId(), username: "alice", email: "alice@example.com", createdAt: new Date() },
    { _id: new ObjectId(), username: "bob", email: "bob@example.com", createdAt: new Date() },
    { _id: new ObjectId(), username: "charlie", email: "charlie@example.com", createdAt: new Date() },
    { _id: new ObjectId(), username: "diana", email: "diana@example.com", createdAt: new Date() },
    { _id: new ObjectId(), username: "eve", email: "eve@example.com", createdAt: new Date() },
  ];
  await db.collection("users").insertMany(userDocs);
  const userMap = {};
  userDocs.forEach(u => { userMap[u.username] = u._id; });

  const catDocs = [
    { _id: new ObjectId(), name: "技术", slug: "tech" },
    { _id: new ObjectId(), name: "生活", slug: "life" },
    { _id: new ObjectId(), name: "随笔", slug: "essay" },
    { _id: new ObjectId(), name: "教程", slug: "tutorial" },
    { _id: new ObjectId(), name: "开源", slug: "opensource" },
  ];
  await db.collection("categories").insertMany(catDocs);
  const catMap = {};
  catDocs.forEach(c => { catMap[c.slug] = c._id; });

  const tagDocs = [
    { _id: new ObjectId(), name: "MongoDB" },
    { _id: new ObjectId(), name: "JavaScript" },
    { _id: new ObjectId(), name: "Python" },
    { _id: new ObjectId(), name: "FastAPI" },
    { _id: new ObjectId(), name: "Docker" },
    { _id: new ObjectId(), name: "Git" },
    { _id: new ObjectId(), name: "Linux" },
    { _id: new ObjectId(), name: "前端" },
    { _id: new ObjectId(), name: "数据库" },
    { _id: new ObjectId(), name: "AI" },
    { _id: new ObjectId(), name: "读书" },
    { _id: new ObjectId(), name: "旅行" },
  ];
  await db.collection("tags").insertMany(tagDocs);
  const tagMap = {};
  tagDocs.forEach(t => { tagMap[t.name] = t._id; });

  const postData = [
    ["MongoDB 聚合管道详解", "aggregate() 是 MongoDB 最强大的查询工具...", "tech", ["MongoDB", "数据库"], "alice"],
    ["FastAPI 入门教程", "FastAPI 是一个现代 Python Web 框架...", "tutorial", ["FastAPI", "Python"], "alice"],
    ["JavaScript 异步编程", "Promise、async/await 是 JS 异步编程的核心...", "tech", ["JavaScript", "前端"], "bob"],
    ["Python 爬虫入门", "用 Python 写爬虫抓取网页数据...", "tutorial", ["Python", "AI"], "bob"],
    ["Docker 部署实战", "用 Docker 部署 Web 应用...", "tutorial", ["Docker", "Linux"], "charlie"],
    ["Git 工作流最佳实践", "团队协作中的 Git 工作流...", "opensource", ["Git"], "charlie"],
    ["周末美食推荐", "推荐几家好吃的餐厅...", "life", [], "diana"],
    ["运动打卡第 30 天", "坚持跑步 30 天，身体变化很大...", "life", [], "diana"],
    ["读《重构》有感", "读完了 Martin Fowler 的《重构》...", "essay", ["读书"], "eve"],
    ["MongoDB 索引优化实战", "如何给 MongoDB 查询建合适的索引...", "tech", ["MongoDB", "数据库"], "alice"],
    ["FastAPI 与 MongoDB 整合", "FastAPI + MongoDB 构建 RESTful API...", "tutorial", ["FastAPI", "Python", "MongoDB"], "alice"],
    ["Linux 常用命令", "Linux 开发者必备命令...", "tech", ["Linux"], "bob"],
    ["机器学习入门路线", "从零开始学机器学习...", "tutorial", ["AI", "Python"], "charlie"],
    ["日本旅行攻略", "第一次去日本的旅行攻略...", "essay", ["旅行"], "eve"],
    ["前端框架对比", "React vs Vue vs Svelte 对比...", "tech", ["前端", "JavaScript"], "bob"],
  ];

  const now = new Date();
  const posts = postData.map(([title, content, catSlug, tagNames, author], i) => ({
    title,
    content,
    excerpt: content.slice(0, 30) + "...",
    authorId: userMap[author],
    categoryId: catMap[catSlug],
    tags: tagNames.map(t => tagMap[t]),
    commentCount: 0,
    published: true,
    createdAt: new Date(now.getFullYear(), now.getMonth(), Math.min(28, 1 + i)),
    updatedAt: new Date(now.getFullYear(), now.getMonth(), Math.min(28, 1 + i)),
  }));
  await db.collection("posts").insertMany(posts);

  const allPosts = await db.collection("posts").find().toArray();
  const commentBodies = [
    "写得很清楚！", "学到了，谢谢分享", "好文章", "收藏了",
    "期待更多内容", "这个很有用", "讲得通俗易懂", "已转发",
    "支持一下", "写得不错", "有收获", "赞",
    "这个思路很好", "回头试试", "总结得很好",
  ];

  const comments = [];
  allPosts.forEach((p, i) => {
    for (let j = 0; j < 3; j++) {
      comments.push({
        postId: p._id,
        authorId: userMap["alice"],
        body: commentBodies[(i * 3 + j) % commentBodies.length],
        createdAt: now,
      });
    }
  });
  await db.collection("comments").insertMany(comments);

  for (const p of allPosts) {
    const count = await db.collection("comments").countDocuments({ postId: p._id });
    await db.collection("posts").updateOne({ _id: p._id }, { $set: { commentCount: count } });
  }

  await db.collection("posts").createIndex("authorId");
  await db.collection("posts").createIndex("categoryId");
  await db.collection("posts").createIndex("createdAt");
  await db.collection("posts").createIndex({ title: "text", content: "text" }, { default_language: "none" });
  await db.collection("comments").createIndex("postId");

  console.log("=== Seed complete ===");
  console.log(`  users:      ${await db.collection("users").countDocuments()}`);
  console.log(`  categories: ${await db.collection("categories").countDocuments()}`);
  console.log(`  tags:       ${await db.collection("tags").countDocuments()}`);
  console.log(`  posts:      ${await db.collection("posts").countDocuments()}`);
  console.log(`  comments:   ${await db.collection("comments").countDocuments()}`);

  await closeDb();
}

seed().catch(console.error);
