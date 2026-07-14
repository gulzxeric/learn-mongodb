from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from app.database import get_db
from app.schemas import PostCreate, PostUpdate, PostResponse

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=dict)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    author_id: str | None = None,
    category_id: str | None = None,
    tag_id: str | None = None,
    published: bool | None = None,
    search: str | None = None,
):
    db = get_db()
    query = {}
    if author_id:
        query["authorId"] = ObjectId(author_id)
    if category_id:
        query["categoryId"] = ObjectId(category_id)
    if tag_id:
        query["tags"] = ObjectId(tag_id)
    if published is not None:
        query["published"] = published
    if search:
        query["$text"] = {"$search": search}

    total = db.posts.count_documents(query)
    posts = (
        db.posts.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = []
    for p in posts:
        author = db.users.find_one({"_id": p["authorId"]})
        category = db.categories.find_one({"_id": p["categoryId"]})
        p["author_name"] = author["username"] if author else None
        p["category_name"] = category["name"] if category else None
        items.append(PostResponse(**p))

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: str):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(400, "Invalid post ID")
    db = get_db()
    post = db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(404, "Post not found")
    return PostResponse(**post)


@router.post("", response_model=PostResponse, status_code=201)
def create_post(body: PostCreate):
    db = get_db()
    if not db.users.find_one({"_id": ObjectId(body.authorId)}):
        raise HTTPException(400, "Author not found")
    if not db.categories.find_one({"_id": ObjectId(body.categoryId)}):
        raise HTTPException(400, "Category not found")

    doc = body.model_dump()
    doc["authorId"] = ObjectId(body.authorId)
    doc["categoryId"] = ObjectId(body.categoryId)
    doc["tags"] = [ObjectId(t) for t in body.tags]
    doc["commentCount"] = 0
    doc["createdAt"] = datetime.now()
    doc["updatedAt"] = datetime.now()

    result = db.posts.insert_one(doc)
    post = db.posts.find_one({"_id": result.inserted_id})
    return PostResponse(**post)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(post_id: str, body: PostUpdate):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(400, "Invalid post ID")
    db = get_db()

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")

    if "categoryId" in update_data:
        update_data["categoryId"] = ObjectId(update_data["categoryId"])
    if "tags" in update_data:
        update_data["tags"] = [ObjectId(t) for t in update_data["tags"]]
    update_data["updatedAt"] = datetime.now()

    result = db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Post not found")
    post = db.posts.find_one({"_id": ObjectId(post_id)})
    return PostResponse(**post)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: str):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(400, "Invalid post ID")
    db = get_db()
    result = db.posts.delete_one({"_id": ObjectId(post_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Post not found")
