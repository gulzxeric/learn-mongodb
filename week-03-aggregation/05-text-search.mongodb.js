use("blog");

// =============================================
// 全文搜索：$text 索引
// =============================================

// $text 索引让你能搜索文章标题和内容中的关键词
// 类似搜索引擎的 "关键词搜索"

// ===== 1. 创建 $text 索引 =====
print("===== 1. 创建全文索引 =====");

// 在 title 和 content 上建全文索引
db.posts.createIndex(
  { title: "text", content: "text" },
  { default_language: "none" }    // 不按英文分词，中文逐字匹配
);
print("✅ 全文索引创建成功");


// ===== 2. 搜索关键词 =====
print("\n===== 2. 搜索 'MongoDB' =====");

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


// ===== 3. 搜索多个关键词 =====
print("\n===== 3. 搜索 'Python 数据' =====");

db.posts.aggregate([
  {
    $match: {
      $text: { $search: "Python 数据" }
    }
  },
  {
    $project: {
      title: 1,
      score: { $meta: "textScore" },
      _id: 0
    }
  },
  { $sort: { score: -1 } }
]).forEach(p => print(`  《${p.title}》 评分:${p.score}`));


// ===== 4. 没有全文索引会怎样？ =====
print("\n===== 4. 对比：正则查询 vs 全文索引 =====");

// 正则查询（慢，不能排序）
const regexStart = Date.now();
db.posts.find({ title: /MongoDB/ }).toArray();
const regexTime = Date.now() - regexStart;

// 全文搜索（快，能按相关性排序）
const textStart = Date.now();
db.posts.aggregate([
  { $match: { $text: { $search: "MongoDB" } } }
]).toArray();
const textTime = Date.now() - textStart;

print(`  正则查询: ${regexTime}ms`);
print(`  全文搜索: ${textTime}ms`);
print("  💡 数据量大时差异更明显");


// ===== 5. 查看现有索引 =====
print("\n===== 5. posts 集合所有索引 =====");
db.posts.getIndexes().forEach(idx => {
  print(`  ${idx.name}: ${JSON.stringify(idx.key)}`);
});


// ===== 总结 =====
print("\n===== 全文搜索总结 =====");
print("  1. 先建 $text 索引（支持多字段）");
print("  2. $match: { $text: { $search: '关键词' } }");
print("  3. 用 { $meta: 'textScore' } 获取匹配度");
print("  4. 按 textScore 排序，最相关的排前面");
print("  5. 中文搜索建议设 default_language: 'none'");
