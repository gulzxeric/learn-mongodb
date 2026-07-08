import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# .env 在项目根目录
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)
uri = os.getenv("MONGO_URI")
client = MongoClient(uri)
db = client["blog"]

# ========== 查询所有文章 ==========
print("===== 所有文章 =====")
for post in db.posts.find().sort("createdAt", -1):
    print(f"《{post['title']}》 评论数:{post['commentCount']}")

# ========== 条件查询 ==========
print("\n===== commentCount > 0 的文章 =====")
for post in db.posts.find({"commentCount": {"$gt": 0}}):
    print(f"《{post['title']}》 评论数:{post['commentCount']}")

# ========== 插入新文章 ==========
print("\n===== 插入新文章 =====")
author = db.users.find_one({"username": "alice"})
new_post = {
    "title": "用 Python 操作 MongoDB",
    "content": "pymongo 是 MongoDB 的 Python 驱动...",
    "authorId": author["_id"],
    "commentCount": 0,
    "published": True,
    "createdAt": datetime.now(),
    "updatedAt": datetime.now()
}
result = db.posts.insert_one(new_post)
print(f"新文章 ID: {result.inserted_id}")

# ========== 更新 ==========
print("\n===== 更新文章 =====")
db.posts.update_one(
    {"_id": result.inserted_id},
    {"$set": {"commentCount": 1}}
)
print("✅ 已更新 commentCount")

# ========== 删除 ==========
print("\n===== 删除刚才插入的文章 =====")
db.posts.delete_one({"_id": result.inserted_id})
print("✅ 已删除")

# ========== $lookup 关联查询 ==========
print("\n===== $lookup: 文章 + 作者 + 分类 =====")
pipeline = [
    {
        "$lookup": {
            "from": "users",
            "localField": "authorId",
            "foreignField": "_id",
            "as": "author"
        }
    },
    {
        "$lookup": {
            "from": "categories",
            "localField": "categoryId",
            "foreignField": "_id",
            "as": "category"
        }
    },
    {"$addFields": {
        "author": {"$arrayElemAt": ["$author", 0]},
        "category": {"$arrayElemAt": ["$category", 0]}
    }}
]
for post in db.posts.aggregate(pipeline):
    author_name = post.get("author", {}).get("username", "未知")
    cat_name = post.get("category", {}).get("name", "未分类")
    print(f"《{post['title']}》 作者:{author_name} 分类:{cat_name}")

# ========== 索引操作 ==========
print("\n===== 索引 =====")
db.posts.create_index("commentCount")               # 单字段
db.posts.create_index([("authorId", 1), ("createdAt", -1)])  # 复合

for idx in db.posts.list_indexes():
    print(f"  {idx['name']}: {idx['key']}")

client.close()
print("\n===== 完成 =====")
