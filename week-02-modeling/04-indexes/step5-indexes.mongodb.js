use("blog");

// =============================================
// Step 5：索引
// 索引 = 书的目录，让查询更快
// =============================================

// ===== 1. 不加索引的查询 =====
print("===== 1. 无索引查询（全表扫描） =====");

// 清理旧测试数据，删除所有非博客数据的索引
db.posts.dropIndexes();

// 删除博客原始数据以外的测试数据
db.posts.deleteMany({ title: /^测试文章/ });

// 插入 100 条测试数据
for (let i = 0; i < 100; i++) {
  db.posts.insertOne({
    title: `测试文章 ${i}`,
    content: "内容...",
    authorId: ObjectId(),
    commentCount: i,
    createdAt: new Date()
  });
}

// 查 commentCount > 50 的文章，看执行情况
const result = db.posts.find({ commentCount: { $gt: 50 } }).explain("executionStats");
print("查询方式:", result.queryPlanner.winningPlan.inputStage?.stage || result.queryPlanner.winningPlan.stage);
print("扫描文档数:", result.executionStats.totalDocsExamined);


// ===== 2. 建索引 =====
print("\n===== 2. 创建索引 =====");

// 单字段索引：1 升序，-1 降序
db.posts.createIndex({ commentCount: 1 });
print("✅ 索引创建成功: commentCount_1");

// 再查一次，对比
const result2 = db.posts.find({ commentCount: { $gt: 50 } }).explain("executionStats");
const plan = result2.queryPlanner.winningPlan;
print("顶层阶段:", plan.stage);       // FETCH
print("实际扫描:", plan.inputStage?.stage || plan.stage);  // IXSCAN
print("扫描文档数:", result2.executionStats.totalDocsExamined);  // 49（不是全部）


// ===== 3. 给常用查询字段建索引 =====
print("\n===== 3. 博客项目常用索引 =====");

// 加速按作者查文章
db.posts.createIndex({ authorId: 1 });
print("✅ posts.authorId 索引");

// 加速按创建时间排序
db.posts.createIndex({ createdAt: -1 });
print("✅ posts.createdAt 索引");

// 复合索引：按作者查，再按时间排序
// 如果经常查 "alice 的文章按时间倒序"，这个索引最有效
db.posts.createIndex({ authorId: 1, createdAt: -1 });
print("✅ posts.(authorId + createdAt) 复合索引");

// 唯一索引：不让用户名重复
db.users.createIndex({ username: 1 }, { unique: true });
print("✅ users.username 唯一索引");


// ===== 4. 验证唯一索引 =====
print("\n===== 4. 唯一索引效果 =====");

try {
  db.users.insertOne({ username: "alice", email: "another@example.com" });
} catch (e) {
  print("❌ 插不进去:", e.message);
}


// ===== 5. 查看所有索引 =====
print("\n===== 5. 查看索引列表 =====");
db.posts.getIndexes().forEach(idx => {
  print("索引名:", idx.name, "字段:", JSON.stringify(idx.key));
});


// ===== 6. 清理测试数据 =====
print("\n===== 6. 清理测试数据 =====");
db.posts.deleteMany({ title: /^测试文章/ });
print("已清理 100 条测试数据");


// ===== 总结 =====
print("\n===== 怎么看 explain() =====");
print("  COLLSCAN → 全表扫描（没走索引，慢）");
print("  IXSCAN → 索引扫描（走了索引，快）");
print("  FETCH → 根据索引结果取文档（正常）");
print("  关键看 totalDocsExamined: 远小于总数说明索引有效");

print("\n===== 索引总结 =====");
print("1. 不加索引 → COLLSCAN（全表扫描，慢）");
print("2. 加索引 → IXSCAN（索引扫描，快）");
print("3. 唯一索引 → 防重复数据");
print("4. 复合索引 → 多个字段组合查询");
print("5. explain() → 看查询是否走了索引");
print("6. 索引不是越多越好，写操作会变慢");