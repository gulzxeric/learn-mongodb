use("blog");

// =============================================
// 实战统计：博客数据分析
// =============================================

// ===== 1. 作者发文排行 =====
print("===== 1. 作者发文排行 =====");

db.posts.aggregate([
  {
    $group: {
      _id: "$authorId",
      postCount: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "author"
    }
  },
  { $unwind: "$author" },
  { $sort: { postCount: -1 } },
  {
    $project: {
      author: "$author.username",
      postCount: 1,
      _id: 0
    }
  }
]).forEach(g => print(`  ${g.author}: ${g.postCount} 篇`));


// ===== 2. 各分类文章数 =====
print("\n===== 2. 各分类文章数 =====");

db.posts.aggregate([
  {
    $group: {
      _id: "$categoryId",
      count: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "_id",
      foreignField: "_id",
      as: "category"
    }
  },
  { $unwind: "$category" },
  { $sort: { count: -1 } },
  {
    $project: {
      category: "$category.name",
      count: 1,
      _id: 0
    }
  }
]).forEach(g => print(`  ${g.category}: ${g.count} 篇`));


// ===== 3. 评论最多的文章排行 =====
print("\n===== 3. 评论最多的文章 =====");

db.comments.aggregate([
  {
    $group: {
      _id: "$postId",
      commentCount: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "posts",
      localField: "_id",
      foreignField: "_id",
      as: "post"
    }
  },
  { $unwind: "$post" },
  {
    $project: {
      title: "$post.title",
      commentCount: 1,
      _id: 0
    }
  }
]).forEach(g => print(`  《${g.title}》: ${g.commentCount} 条评论`));


// ===== 4. 发表最多评论的用户 =====
print("\n===== 4. 最活跃评论用户 =====");

db.comments.aggregate([
  {
    $group: {
      _id: "$authorId",
      commentCount: { $sum: 1 }
    }
  },
  { $sort: { commentCount: -1 } },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $project: {
      username: "$user.username",
      commentCount: 1,
      _id: 0
    }
  }
]).forEach(g => print(`  ${g.username}: ${g.commentCount} 条评论`));


// ===== 5. 完整文章+作者+分类+标签（一次聚合） =====
print("\n===== 5. 完整文章信息（一次查完） =====");

db.posts.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "authorId",
      foreignField: "_id",
      as: "author"
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "categoryId",
      foreignField: "_id",
      as: "category"
    }
  },
  {
    $lookup: {
      from: "tags",
      localField: "tags",
      foreignField: "_id",
      as: "tagInfo"
    }
  },
  {
    $addFields: {
      author: { $arrayElemAt: ["$author", 0] },
      category: { $arrayElemAt: ["$category", 0] }
    }
  },
  {
    $project: {
      title: 1,
      author: "$author.username",
      category: "$category.name",
      tags: { $map: { input: "$tagInfo", as: "t", in: "$$t.name" } },
      commentCount: 1,
      _id: 0
    }
  }
]).forEach(p => {
  print(`  《${p.title}》`);
  print(`    作者: ${p.author}  分类: ${p.category}`);
  print(`    标签: ${p.tags.join(", ")}  评论: ${p.commentCount}`);
});
