use("blog");

// =============================================
// 练习 1：嵌入模式
// 插入一个用户，内嵌 2 个地址
// =============================================

// 清空 users 集合
db.users.drop();

// 插入用户，addresses 内嵌在文档里
db.users.insertOne({
  username: "Eric",
  email: "eric@example.com",
  addresses: [
    { type: "billing", city: "北京", street: "朝阳路1号" },
    { type: "shipping", city: "上海", street: "南京路2号" }
  ]
});

// 查用户——地址自动带出来
const user = db.users.findOne({ username: "Eric" });
print("用户名:", user.username);
print("地址数量:", user.addresses.length);
user.addresses.forEach(a => print(" -", a.type, ":", a.city, a.street));
