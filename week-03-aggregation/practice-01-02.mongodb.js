use("learn_agg");

// =============================================
// 第 3 周 练习：$match / $sort / $project / $group
// 把题目下方的注释解开，补全代码
// =============================================

// 准备数据
db.orders.drop();
for (let i = 0; i < 30; i++) {
  db.orders.insertOne({
    item: ["手机", "电脑", "耳机", "键盘"][Math.floor(Math.random() * 4)],
    status: ["pending", "paid", "shipped", "cancelled"][Math.floor(Math.random() * 4)],
    price: Math.floor(Math.random() * 1000) + 100,
    qty: Math.floor(Math.random() * 3) + 1,
    city: ["北京", "上海", "深圳", "广州"][Math.floor(Math.random() * 4)]
  });
}

print("数据已准备\n");

// ===== 练习 1：$match =====
// 找出 status 为 "paid" 的订单
print("===== 练习 1：已付款订单 =====");
db.orders.aggregate([
  { $match: { status: "paid" } }
]).forEach(o => print(`  ${o.item} ¥${o.price}`));


// ===== 练习 2：$match + $sort =====
// 找出 status 为 "shipped" 的订单，按 price 降序排列
print("\n===== 练习 2：已发货订单（价格从高到低）=====");
db.orders.aggregate([
  { $match: { status: 'shipped' } },
  { $sort: { price: -1 } }
]).forEach(o => print(`  ${o.item} ¥${o.price} x${o.qty}`));


// ===== 练习 3：$project =====
// 只显示 item 和 price，不要 _id
print("\n===== 练习 3：投影 =====");
db.orders.aggregate([
  { $project: { item: 1, price: 1, _id: 0 } }
]).forEach(o => print(`  ${o.item} ¥${o.price}`));


// ===== 练习 4：$project 创建新字段 =====
// 显示 item 和总价（price × qty），字段名叫 total
print("\n===== 练习 4：计算总价 =====");
db.orders.aggregate([
  { $project: {
    item: 1,
    total: { $multiply: ["$price", "$qty"] },
    _id: 0
  }}
]).forEach(o => print(`  ${o.item} 总价¥${o.total}`));


// ===== 练习 5：$group 计数 =====
// 按 city 分组，统计每个城市有多少订单
print("\n===== 练习 5：各城市订单数 =====");
db.orders.aggregate([
  { $group: { _id: "$city", count: {$sum: 1}} }
]).forEach(g => print(`  ${g._id}: ${g.count} 单`));


// ===== 练习 6：$group 求和 =====
// 按 item 分组，统计每个商品卖了多少钱（总价）
print("\n===== 练习 6：各商品销售额 =====");
db.orders.aggregate([
  { $group: {
    _id: "$item",
    revenue: { $sum: { $multiply: ["$price", "$qty"] } }
  }}
]).forEach(g => print(`  ${g._id}: ¥${g.revenue}`));


// ===== 练习 7：组合 =====
// 找出 status 为 "paid" 的订单，按 item 分组，统计销售额
print("\n===== 练习 7：已付款订单各商品销售额 =====");
db.orders.aggregate([
  { $match: { status: 'paid' } },
  { $group: { 
    _id: "$item",
    revenue: {$sum: {$multiply: ["$price", "$qty"]}}
   } }
]).forEach(g => print(`  ${g._id}: ¥${g.revenue}`));


// 清理
db.orders.drop();
print("\n✅ 清理完成");
