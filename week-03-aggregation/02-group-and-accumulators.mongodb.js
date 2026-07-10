use("learn_agg");

// =============================================
// Stage 2: $group + 累加器
// 用自己的数据库，不污染 blog
// =============================================

// $group 是聚合管道的核心——分组统计

// 先准备订单数据
db.orders.drop();
for (let i = 0; i < 50; i++) {
  db.orders.insertOne({
    item: ["手机", "电脑", "耳机"][Math.floor(Math.random() * 3)],
    status: ["pending", "paid", "shipped"][Math.floor(Math.random() * 3)],
    price: Math.floor(Math.random() * 1000) + 100,
    qty: Math.floor(Math.random() * 5) + 1
  });
}

// ===== 1. 基础 $group =====
print("===== 1. 每种 status 有多少订单？ =====");

db.orders.aggregate([
  {
    $group: {
      _id: "$status",            // 按 status 分组
      count: { $sum: 1 }         // 每组计数
    }
  }
]).forEach(g => print(`  ${g._id}: ${g.count} 单`));


// ===== 2. 累加器 =====
print("\n===== 2. 各 status 的订单总额和平均金额 =====");

db.orders.aggregate([
  {
    $group: {
      _id: "$status",
      totalPrice: { $sum: "$price" },
      avgPrice: { $avg: "$price" },
      maxPrice: { $max: "$price" },
      minPrice: { $min: "$price" },
      orderCount: { $sum: 1 }
    }
  }
]).forEach(g => {
  print(`  ${g._id}:`);
  print(`    订单数: ${g.orderCount}`);
  print(`    总额: ¥${g.totalPrice}`);
  print(`    均价: ¥${Math.round(g.avgPrice)}`);
  print(`    最高: ¥${g.maxPrice}`);
  print(`    最低: ¥${g.minPrice}`);
});


// ===== 3. $sort + $group 配合 =====
print("\n===== 3. 各商品销量排行 =====");

db.orders.aggregate([
  {
    $group: {
      _id: "$item",
      totalQty: { $sum: "$qty" },
      revenue: { $sum: { $multiply: ["$price", "$qty"] } }
    }
  },
  { $sort: { totalQty: -1 } }
]).forEach(g => print(`  ${g._id}: 卖${g.totalQty}件 营收¥${g.revenue}`));


// ===== 4. $group 还能做别的 —— 开眼界 =====
print("\n===== 4. 收集每个 status 的所有订单金额 =====");

db.orders.aggregate([
  {
    $group: {
      _id: "$status",
      prices: { $push: "$price" },  // $push 把值收成数组
      firstItem: { $first: "$item" }, // 组内第一个商品
      lastItem: { $last: "$item" }    // 组内最后一个商品
    }
  }
]).forEach(g => {
  print(`  ${g._id}:`);
  print(`    订单金额列表: [${g.prices.join(", ")}]`);
  print(`    第一个商品: ${g.firstItem}`);
  print(`    最后一个商品: ${g.lastItem}`);
});


// ===== 清理 =====
db.orders.drop();
print("\n✅ learn_agg.orders 已清理");
