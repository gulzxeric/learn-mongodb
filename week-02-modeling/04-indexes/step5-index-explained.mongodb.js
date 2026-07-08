use("blog");

// =============================================
// 索引详解
// =============================================

// 1. 先准备一批数据（2000 条订单）
print("===== 准备 2000 条订单数据 =====");
db.orders.drop();
for (let i = 0; i < 2000; i++) {
  db.orders.insertOne({
    orderId: i + 1,
    userId: Math.floor(Math.random() * 100),   // 0-99
    amount: Math.floor(Math.random() * 1000),   // 0-999
    status: ["pending", "paid", "shipped", "cancelled"][Math.floor(Math.random() * 4)],
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 30)  // 随机过去30天内
  });
}
print(`共 ${db.orders.countDocuments()} 条`);


// 2. 没索引查一次 —— 全表扫描
print("\n===== 没索引：查 status='shipped' =====");
let r1 = db.orders.find({ status: "shipped" }).explain("executionStats");
print("扫描方式:", r1.queryPlanner.winningPlan.stage);
print("扫描文档数:", r1.executionStats.totalDocsExamined, "(所有文档)");
print("返回结果:", r1.executionStats.nReturned, "条");


// 3. 加索引
print("\n===== 创建索引 status_1 =====");
db.orders.createIndex({ status: 1 });


// 4. 有索引再查一次 —— 索引扫描
print("\n===== 有索引：查 status='shipped' =====");
let r2 = db.orders.find({ status: "shipped" }).explain("executionStats");
let plan = r2.queryPlanner.winningPlan;
print("顶层阶段:", plan.stage);
print("索引扫描:", plan.inputStage?.stage);
print("扫描文档数:", r2.executionStats.totalDocsExamined, "(只扫匹配的)");
print("返回结果:", r2.executionStats.nReturned, "条");


// 5. 那索引到底做了什么？
print("\n===== 索引原理（类比） =====");
print("没索引 = 在图书馆一本本翻书找你要的书名");
print("有索引 = 先查卡片目录，找到书的位置，直接去拿");
print("");
print("索引就是一张排序好的对照表：");
print("  status → [文档位置1, 文档位置2, ...]");
print("比如索引中存的是：");
print("  'paid'    → [doc_3, doc_17, doc_42, ...]");
print("  'shipped' → [doc_5, doc_12, doc_88, ...]");
print("MongoDB 查 'shipped' 时，直接在索引里找到这组位置");
print("然后只去拿这些文档，跳过所有不相关的");


// 6. 索引的代价
print("\n===== 索引的代价 =====");
print("✅ 好处：查询变快（尤其数据量大时）");
print("❌ 代价1：写入变慢（插入/更新/删除时也要更新索引）");
print("❌ 代价2：占磁盘空间（索引也是数据）");
print("❌ 代价3：索引过多，查询优化器也可能选错");
print("");
print("💡 原则：给查询条件建索引，不是给所有字段建");


// 7. 查非索引字段 —— 索引也救不了
print("\n===== 索引局限：查 amount 没索引 =====");
let r3 = db.orders.find({ amount: { $gt: 800 } }).explain("executionStats");
print("扫描方式:", r3.queryPlanner.winningPlan.stage);
print("扫描文档数:", r3.executionStats.totalDocsExamined);

// 给 amount 加索引
db.orders.createIndex({ amount: 1 });
let r4 = db.orders.find({ amount: { $gt: 800 } }).explain("executionStats");
let plan4 = r4.queryPlanner.winningPlan;
print("\n创建 amount 索引后：");
print("扫描方式:", plan4.inputStage?.stage || plan4.stage);
print("扫描文档数:", r4.executionStats.totalDocsExamined);


// 8. 什么时候索引无效？
print("\n===== 索引不生效的场景 =====");

// 场景 A：用了 $regex 前缀模糊
print("\n场景A: title 以'测试'开头 → 走不了索引（如果没建特殊索引）");
let r5a = db.orders.find({ status: /^paid/ }).explain("executionStats");
let plan5a = r5a.queryPlanner.winningPlan;
print("  status: /^paid/ →", plan5a.inputStage?.stage || plan5a.stage);

// 场景 B：没用索引字段做查询条件
print("场景B: 查 content 字段（没索引）→ COLLSCAN");

// 场景 C：查了索引字段，但返回太多数据，MongoDB 觉得不如全表扫
print("场景C: 查 status 存在($exists) → 数据量太大, 可能不走索引");


// 9. 查看索引列表
print("\n===== orders 集合的索引 =====");
db.orders.getIndexes().forEach(idx => {
  print("  ", idx.name, JSON.stringify(idx.key));
});


// 10. 清理
print("\n===== 清理 =====");
db.orders.drop();
print("已删除 orders 集合");
