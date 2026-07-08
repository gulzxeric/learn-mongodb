use("blog");

// =============================================
// $lookup 深度讲解
// =============================================

// 先确保有数据
const count = db.posts.countDocuments();
if (count === 0) {
  print("请先运行 blog-data-model.mongodb.js 初始化数据");
}

// ===== 1. 基础语法 =====
print("===== 1. 基础语法 =====");

db.posts.aggregate([
  {
    $lookup: {
      from: "users",       // 要关联哪个集合
      localField: "authorId", // 当前集合的字段
      foreignField: "_id",    // 关联集合的字段
      as: "author"            // 结果放进这个新字段（数组）
    }
  }
]).forEach(p => {
  // 注意！author 是数组，因为 $lookup 可能匹配到多条
  print(`《${p.title}》→ author 类型:`, typeof p.author, "长度:", p.author.length);
});


// ===== 2. 为什么 as 结果是数组？ =====
print("\n===== 2. as 是数组，不是对象 =====");

// 因为是一对多关联——一个 authorId 可能在 users 里匹配 0、1 或多条
// 所以 $lookup 统一用数组返回，即使只有一条
// 取第一条就用 [0]，转对象用 $unwind
// { _id: "xxx", title: "...", author: [{ _id: "xxx", username: "alice", ... }] }


// ===== 3. 三种取值方式 =====
print("\n===== 3. 三种取值方式 =====");

// 方式 A：手工取 [0]（简单直观）
print("--- 方式 A：p.author[0].username ---");
db.posts.aggregate([
  { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "author" } }
]).forEach(p => {
  print(`《${p.title}》 ${p.author[0]?.username}`);
});

// 方式 B：$addFields + $arrayElemAt（管道内转换）
print("\n--- 方式 B：管道内转成对象 ---");
db.posts.aggregate([
  { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "author" } },
  { $addFields: { author: { $arrayElemAt: ["$author", 0] } } }
]).forEach(p => {
  // 现在 author 是对象了，不是数组
  print(`《${p.title}》 ${p.author.username}`);
});

// 方式 C：$unwind（把数组拆成多行，通常不需要）
// 只有当一篇文章可能有多个作者时才用


// ===== 4. 数组字段关联（N:M） =====
print("\n===== 4. 数组字段关联 N:M =====");

// posts.tags 是 [tagId, tagId, ...]，直接关联 tags._id
db.posts.aggregate([
  {
    $lookup: {
      from: "tags",
      localField: "tags",    // tags 是数组，$lookup 自动处理
      foreignField: "_id",
      as: "tagInfo"
    }
  }
]).forEach(p => {
  const names = p.tagInfo.map(t => t.name).join(", ");
  print(`《${p.title}》 标签: ${names}`);
});


// ===== 5. 链式 $lookup（一次查多个关联） =====
print("\n===== 5. 一次查 3 个关联 =====");

db.posts.aggregate([
  { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "author" } },
  { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "category" } },
  { $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tagInfo" } },
  { $addFields: {
    author: { $arrayElemAt: ["$author", 0] },
    category: { $arrayElemAt: ["$category", 0] }
  }}
]).forEach(p => {
  const tags = p.tagInfo.map(t => t.name).join(", ");
  print(
    `《${p.title}》` +
    ` | 作者: ${p.author.username}` +
    ` | 分类: ${p.category.name}` +
    ` | 标签: ${tags}`
  );
});


// ===== 6. 使用思路总结 =====
print("\n===== 6. 什么时候用 $lookup =====");

print("✅ 适合 $lookup 的场景:");
print("  - 详情页展示：文章+作者+分类+标签，一次查完");
print("  - 列表页：文章列表连带作者名、评论数");
print("  - 报表统计：需要跨集合拼数据的场景");

print("\n❌ 不适合 $lookup 的场景:");
print("  - 频繁查询的热门接口（$lookup 比单表查询慢）");
print("  - 可以嵌入就不要引用，嵌入连 $lookup 都不用");
print("  - 数据量大时 $lookup 要考虑索引");

print("\n💡 设计原则（决策顺序）:");
print("  优先嵌入 → 嵌入不了就用引用 → 引用后用 $lookup 拼数据");
