use("blog");

// =============================================
// 第 3 周 综合练习
// 先跑 00-seed-data.mongodb.js 才有足够数据
// =============================================
// print(show('collections'))
// print(db.users.find())
// print(db.categories.find())
// print(db.posts.find())
// print(db.tags.find())

// ===== 练习 1：$match + $sort =====
// 找出已发布(published: true)的文章，按创建时间倒序
print("===== 练习 1：已发布文章(最新在前) =====");
// 请补全：
db.posts.aggregate([
  {
    $match: { published: true }
  }, {
    $sort: { createdAt: -1 }
  }
]).forEach(p => { print(p.title, p.createdAt) })


// ===== 练习 2：$project 计算 =====
// 显示文章标题和摘要长度($strLenCP)，_id 不要
print("\n===== 练习 2：摘要长度 =====");
// 请补全：
db.posts.aggregate([
  {
    $project: { title: 1, excerptLength: { $strLenCP: "$excerpt" }, _id: 0 }
  }
]).forEach(p => { print(`Title:  ${p.title}, len of excerpt: ${p.excerptLength}`) })


// ===== 练习 3：$group + $lookup =====
// 按分类统计文章数，关联出分类名
print("\n===== 练习 3：各分类文章数 =====");
// 请补全：
db.posts.aggregate([
  {
    $group: {
      _id: "$categoryId",
      count: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: 'categories',
      localField: '_id',
      foreignField: '_id',
      as: 'category'
    }
  }
]).forEach(p => print(p.category[0].name, p.count))


// ===== 练习 4：$unwind + $group =====
// 统计标签云：每个标签被多少文章使用，降序排列，关联出标签名
print("\n===== 练习 4：标签云排行 =====");
// 你的方案：
// db.posts.aggregate([
//   { $unwind: '$tags' },
//   { $group: { _id: "$tags", count: { $sum: 1 } } },
//   { $sort: { count: -1 } },
//   { $lookup: { from: 'tags', localField: '_id', foreignField: '_id', as: 'tagName' } },
//   { $project: { tagName: '$tagName.name', count:1, _id:0 } }
// ]).forEach(p => print(p.tagName[0], p.count))

// 推荐方案（$addFields + $arrayElemAt 转对象，更清晰）：
db.posts.aggregate([
  { $unwind: "$tags" },
  { $group: { _id: "$tags", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $lookup: { from: "tags", localField: "_id", foreignField: "_id", as: "tagName" } },
  { $addFields: { tagName: { $arrayElemAt: ["$tagName", 0] } } },
  { $project: { tagName: "$tagName.name", count: 1, _id: 0 } }
]).forEach(p => print(p.tagName, p.count))


// ===== 练习 5：$text 搜索 =====
// 搜索包含 "MongoDB" 的文章，按匹配度降序，只显示标题和评分
print("\n===== 练习 5：全文搜索 MongoDB =====");
// 请补全：
db.posts.createIndex(
  { title: "text", content: "text" },
  { default_language: "none" }    // 不按英文分词，中文逐字匹配
);
print("✅ 全文索引创建成功");

db.posts.aggregate([
  {
    $match: {
      $text: { $search: "MongoDB" }
    }
  },
  {
    $project: {
      title: 1,
      score: { $meta: "textScore" },    // 匹配度评分
      _id: 0
    }
  },
  { $sort: { score: -1 } }              // 按匹配度排序
]).forEach(p => print(`  《${p.title}》 评分:${p.score}`));


// ===== 练习 6：综合 =====
// 查找评论数大于 0 的文章，关联出作者名和分类名
// 只显示标题、作者、分类、评论数（用 $lookup + $addFields）
print("\n===== 练习 6：热门文章（有评论的）=====");
db.posts.aggregate([
  { $match: { commentCount: { $gt: 0 } } },     // 只留有评论的文章
  { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "author" } },
  { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "category" } },
  { $addFields: {
    author: { $arrayElemAt: ["$author", 0] },
    category: { $arrayElemAt: ["$category", 0] }
  }},
  { $project: {
    title: 1,
    author: "$author.username",
    category: "$category.name",
    commentCount: 1,
    _id: 0
  }}
]).forEach(p => print(`《${p.title}》 ${p.author} ${p.category} ${p.commentCount}条评论`));
// db.comments.aggregate([
//   {
//     $group: {
//       _id: '$postId',
//       totalComments: {
//         $sum: 1
//       }
//     }
//   },
//   {
//     $match: {
//       totalComments: {$gt: 0}
//     }
//   },
//   {
//     $lookup: {
//       from: 'users',
//       localField: '_id',
//       foreignField: '_id',
//       as: 'user'
//     }
//   }
// ]).forEach(p => print(p))
