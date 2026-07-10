use("blog");

// =============================================
// Stage 3: $unwind
// 把数组拆成多行
// =============================================

// $unwind 把数组里的每个元素拆成一条文档
// 其他字段保持不变

// ===== 1. $unwind 效果 =====
print("===== 1. $unwind 拆开 tags 数组 =====");

// 先看一篇带标签的文章原始样子
const samplePost = db.posts.findOne({ title: "MongoDB 聚合管道详解", tags: { $exists: true, $ne: [] } });
print("原始文档（只有一条）:");
print(`  《${samplePost.title}》 tags: [${samplePost.tags.length} 个]`);

// $unwind 之后变成多条
print("\n$unwind 后:");
db.posts.aggregate([
  { $match: { _id: samplePost._id } },
  { $unwind: "$tags" }
]).forEach(p => print(`  《${p.title}》 → tagId: ${p.tags}`));


// ===== 2. 实战：标签云（每个标签被多少文章使用） =====
print("\n===== 2. 标签云：各标签使用次数 =====");

db.posts.aggregate([
  { $unwind: "$tags" },             // 每个标签拆成一行
  {
    $group: {
      _id: "$tags",                  // 按标签 ID 分组
      count: { $sum: 1 }             // 计数
    }
  },
  { $sort: { count: -1 } }          // 按使用次数降序
]).forEach(g => {
  const tag = db.tags.findOne({ _id: g._id });
  print(`  ${tag.name}: ${g.count} 篇文章`);
});

// db.posts.aggregate([
//   {
//     $unwind: "$tags"
//   }
// ]).forEach(p => print(p))


// ===== 3. 对比：有 $unwind 和没有 =====
print("\n===== 3. 对比：有/无 $unwind =====");
print("  没有 $unwind → tags 是数组，无法按单个标签分组");
print("  有 $unwind → 每个标签变一行，$group 轻松统计");
print("  $unwind 把 N:M 关系展平，方便聚合统计");


// ===== 4. $group + $unwind + $lookup 组合 =====
print("\n===== 4. 标签云（带标签名）=====");

db.posts.aggregate([
  { $unwind: "$tags" },
  {
    $group: {
      _id: "$tags",
      count: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "tags",
      localField: "_id",
      foreignField: "_id",
      as: "tagInfo"
    }
  },
  { $unwind: "$tagInfo" },
  { $sort: { count: -1 } },
  {
    $project: {
      name: "$tagInfo.name",
      count: 1,
      _id: 0
    }
  }
]).forEach(g => print(`  ${g.name}: ${g.count} 篇文章`));
