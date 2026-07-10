// 清理 blog 库里残留的 orders 集合
use("blog");
db.orders.drop();
print("✅ blog.orders 已删除");
