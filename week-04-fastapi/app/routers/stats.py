from fastapi import APIRouter
from bson import ObjectId
from app.database import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/tag-cloud")
def tag_cloud():
    db = get_db()
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    results = list(db.posts.aggregate(pipeline))
    tag_ids = [r["_id"] for r in results]
    tags = {t["_id"]: t["name"] for t in db.tags.find({"_id": {"$in": tag_ids}})}
    return [
        {"tag_id": str(r["_id"]), "name": tags.get(r["_id"], "未知"), "count": r["count"]}
        for r in results
    ]


@router.get("/author-ranking")
def author_ranking():
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$authorId", "post_count": {"$sum": 1}}},
        {"$sort": {"post_count": -1}},
    ]
    results = list(db.posts.aggregate(pipeline))
    user_ids = [r["_id"] for r in results]
    users = {u["_id"]: u["username"] for u in db.users.find({"_id": {"$in": user_ids}})}
    return [
        {"author_id": str(r["_id"]), "username": users.get(r["_id"], "未知"), "post_count": r["post_count"]}
        for r in results
    ]


@router.get("/category-summary")
def category_summary():
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$categoryId", "post_count": {"$sum": 1}}},
        {"$sort": {"post_count": -1}},
    ]
    results = list(db.posts.aggregate(pipeline))
    cat_ids = [r["_id"] for r in results]
    cats = {c["_id"]: c["name"] for c in db.categories.find({"_id": {"$in": cat_ids}})}
    return [
        {"category_id": str(r["_id"]), "name": cats.get(r["_id"], "未知"), "post_count": r["post_count"]}
        for r in results
    ]


@router.get("/dashboard")
def dashboard():
    db = get_db()
    total_posts = db.posts.count_documents({})
    total_comments = db.comments.count_documents({})
    total_users = db.users.count_documents({})
    total_tags = db.tags.count_documents({})
    total_categories = db.categories.count_documents({})
    return {
        "total_posts": total_posts,
        "total_comments": total_comments,
        "total_users": total_users,
        "total_tags": total_tags,
        "total_categories": total_categories,
    }
