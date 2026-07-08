use("blog");

// =============================================
// Step 4：$lookup — MongoDB 的 JOIN
// 一次查询拿到关联数据
// =============================================

// ===== 基础 $lookup：文章带作者 =====
print("========== 文章 + 作者 ($lookup) ==========");

db.posts.aggregate([
  {
    $lookup: {
      from: "users",          // 关联 users 集合
      localField: "authorId", // posts 里的字段
      foreignField: "_id",    // users 里的字段
      as: "author"            // 结果放到这个字段
    }
  }
]).forEach(p => {
  // $lookup 返回的是数组，取第一个
  print("《" + p.title + "》 作者: " + p.author[0].username);
});


// ===== $lookup + 分类 =====
print("\n========== 文章 + 作者 + 分类 ==========");

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
  }
]).forEach(p => {
  print("《" + p.title + "》 " +
    "作者: " + p.author[0].username + " " +
    "分类: " + p.category[0].name);
});



// ===== $lookup 数组字段：文章带标签 =====
print("\n========== 文章 + 标签 ($lookup 数组) ==========");

db.posts.aggregate([
  {
    $lookup: {
      from: "tags",
      localField: "tags",     // tags 是数组 [tagId, tagId]
      foreignField: "_id",
      as: "tagInfo"
    }
  }
]).forEach(p => {
  const tagNames = p.tagInfo.map(t => t.name).join(", ");
  print("《" + p.title + "》 标签: " + tagNames);
});


// ===== 对比：不用 $lookup 要查几次？ =====
print("\n========== 没 $lookup 的写法（对比） ==========");

db.posts.find().forEach(p => {
  const author = db.users.findOne({ _id: p.authorId });           // 查一次
  const cat = db.categories.findOne({ _id: p.categoryId });       // 再查一次
  const tags = p.tags.map(id => db.tags.findOne({ _id: id }));    // 每个标签又查一次

  const tagNames = tags.map(t => t.name).join(", ");
  print("《" + p.title + "》 作者:" + author.username + " 分类:" + cat.name + " 标签:" + tagNames);
});
print("总共查询次数: 远多于 1 次");
