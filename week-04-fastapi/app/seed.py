from datetime import datetime
from bson import ObjectId
from app.database import get_db


def seed():
    db = get_db()

    db.users.drop()
    db.categories.drop()
    db.tags.drop()
    db.posts.drop()
    db.comments.drop()

    users = [
        {"_id": ObjectId(), "username": "alice", "email": "alice@example.com", "createdAt": datetime.now()},
        {"_id": ObjectId(), "username": "bob", "email": "bob@example.com", "createdAt": datetime.now()},
        {"_id": ObjectId(), "username": "charlie", "email": "charlie@example.com", "createdAt": datetime.now()},
        {"_id": ObjectId(), "username": "diana", "email": "diana@example.com", "createdAt": datetime.now()},
        {"_id": ObjectId(), "username": "eve", "email": "eve@example.com", "createdAt": datetime.now()},
    ]
    db.users.insert_many(users)
    user_map = {u["username"]: u["_id"] for u in users}

    categories = [
        {"_id": ObjectId(), "name": "技术", "slug": "tech"},
        {"_id": ObjectId(), "name": "生活", "slug": "life"},
        {"_id": ObjectId(), "name": "随笔", "slug": "essay"},
        {"_id": ObjectId(), "name": "教程", "slug": "tutorial"},
        {"_id": ObjectId(), "name": "开源", "slug": "opensource"},
    ]
    db.categories.insert_many(categories)
    cat_map = {c["slug"]: c["_id"] for c in categories}

    tags = [
        {"_id": ObjectId(), "name": "MongoDB"},
        {"_id": ObjectId(), "name": "JavaScript"},
        {"_id": ObjectId(), "name": "Python"},
        {"_id": ObjectId(), "name": "FastAPI"},
        {"_id": ObjectId(), "name": "Docker"},
        {"_id": ObjectId(), "name": "Git"},
        {"_id": ObjectId(), "name": "Linux"},
        {"_id": ObjectId(), "name": "前端"},
        {"_id": ObjectId(), "name": "数据库"},
        {"_id": ObjectId(), "name": "AI"},
        {"_id": ObjectId(), "name": "读书"},
        {"_id": ObjectId(), "name": "旅行"},
    ]
    db.tags.insert_many(tags)
    tag_map = {t["name"]: t["_id"] for t in tags}

    post_data = [
        ("MongoDB 聚合管道详解", "aggregate() 是 MongoDB 最强大的查询工具...", "tech", [tag_map["MongoDB"], tag_map["数据库"]], "alice"),
        ("FastAPI 入门教程", "FastAPI 是一个现代 Python Web 框架...", "tutorial", [tag_map["FastAPI"], tag_map["Python"]], "alice"),
        ("JavaScript 异步编程", "Promise、async/await 是 JS 异步编程的核心...", "tech", [tag_map["JavaScript"], tag_map["前端"]], "bob"),
        ("Python 爬虫入门", "用 Python 写爬虫抓取网页数据...", "tutorial", [tag_map["Python"], tag_map["AI"]], "bob"),
        ("Docker 部署实战", "用 Docker 部署 Web 应用...", "tutorial", [tag_map["Docker"], tag_map["Linux"]], "charlie"),
        ("Git 工作流最佳实践", "团队协作中的 Git 工作流...", "opensource", [tag_map["Git"]], "charlie"),
        ("周末美食推荐", "推荐几家好吃的餐厅...", "life", [], "diana"),
        ("运动打卡第 30 天", "坚持跑步 30 天，身体变化很大...", "life", [], "diana"),
        ("读《重构》有感", "读完了 Martin Fowler 的《重构》...", "essay", [tag_map["读书"]], "eve"),
        ("MongoDB 索引优化实战", "如何给 MongoDB 查询建合适的索引...", "tech", [tag_map["MongoDB"], tag_map["数据库"]], "alice"),
        ("FastAPI 与 MongoDB 整合", "FastAPI + MongoDB 构建 RESTful API...", "tutorial", [tag_map["FastAPI"], tag_map["Python"], tag_map["MongoDB"]], "alice"),
        ("Linux 常用命令", "Linux 开发者必备命令...", "tech", [tag_map["Linux"]], "bob"),
        ("机器学习入门路线", "从零开始学机器学习...", "tutorial", [tag_map["AI"], tag_map["Python"]], "charlie"),
        ("日本旅行攻略", "第一次去日本的旅行攻略...", "essay", [tag_map["旅行"]], "eve"),
        ("前端框架对比", "React vs Vue vs Svelte 对比...", "tech", [tag_map["前端"], tag_map["JavaScript"]], "bob"),
    ]

    now = datetime.now()
    posts = []
    for i, (title, content, cat_slug, tag_ids, author_name) in enumerate(post_data):
        created = now.replace(day=max(1, min(28, 1 + i)))
        posts.append({
            "title": title,
            "content": content,
            "excerpt": content[:30] + "...",
            "authorId": user_map[author_name],
            "categoryId": cat_map[cat_slug],
            "tags": tag_ids,
            "commentCount": 0,
            "published": True,
            "createdAt": created,
            "updatedAt": created,
        })
    db.posts.insert_many(posts)

    all_posts = list(db.posts.find())
    comment_bodies = [
        "写得很清楚！", "学到了，谢谢分享", "好文章", "收藏了",
        "期待更多内容", "这个很有用", "讲得通俗易懂", "已转发",
        "支持一下", "写得不错", "有收获", "赞",
        "这个思路很好", "回头试试", "总结得很好",
    ]
    comments = []
    for i, p in enumerate(all_posts):
        for j in range(3):
            body = comment_bodies[(i * 3 + j) % len(comment_bodies)]
            comments.append({
                "postId": p["_id"],
                "authorId": user_map["alice"],
                "body": body,
                "createdAt": now,
            })

    db.comments.insert_many(comments)

    for p in all_posts:
        count = db.comments.count_documents({"postId": p["_id"]})
        db.posts.update_one({"_id": p["_id"]}, {"$set": {"commentCount": count}})

    db.posts.create_index("authorId")
    db.posts.create_index("categoryId")
    db.posts.create_index("createdAt")
    db.posts.create_index([("authorId", 1), ("createdAt", -1)])
    db.comments.create_index("postId")

    print("=== Seed complete ===")
    print(f"  users:      {db.users.count_documents({})}")
    print(f"  categories: {db.categories.count_documents({})}")
    print(f"  tags:       {db.tags.count_documents({})}")
    print(f"  posts:      {db.posts.count_documents({})}")
    print(f"  comments:   {db.comments.count_documents({})}")


if __name__ == "__main__":
    seed()
