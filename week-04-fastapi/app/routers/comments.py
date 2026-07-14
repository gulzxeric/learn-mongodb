from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from app.database import get_db
from app.schemas import CommentCreate, CommentResponse

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("", response_model=dict)
def list_comments(
    post_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    db = get_db()
    query = {}
    if post_id:
        if not ObjectId.is_valid(post_id):
            raise HTTPException(400, "Invalid post ID")
        query["postId"] = ObjectId(post_id)

    total = db.comments.count_documents(query)
    comments = (
        db.comments.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [CommentResponse(**c) for c in comments]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{comment_id}", response_model=CommentResponse)
def get_comment(comment_id: str):
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(400, "Invalid comment ID")
    db = get_db()
    comment = db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(404, "Comment not found")
    return CommentResponse(**comment)


@router.post("", response_model=CommentResponse, status_code=201)
def create_comment(body: CommentCreate):
    db = get_db()
    if not ObjectId.is_valid(body.postId):
        raise HTTPException(400, "Invalid post ID")
    if not ObjectId.is_valid(body.authorId):
        raise HTTPException(400, "Invalid author ID")
    if not db.posts.find_one({"_id": ObjectId(body.postId)}):
        raise HTTPException(400, "Post not found")
    if not db.users.find_one({"_id": ObjectId(body.authorId)}):
        raise HTTPException(400, "User not found")

    doc = {
        "postId": ObjectId(body.postId),
        "authorId": ObjectId(body.authorId),
        "body": body.body,
        "createdAt": datetime.now(),
    }
    result = db.comments.insert_one(doc)

    db.posts.update_one(
        {"_id": ObjectId(body.postId)},
        {"$inc": {"commentCount": 1}}
    )

    comment = db.comments.find_one({"_id": result.inserted_id})
    return CommentResponse(**comment)


@router.delete("/{comment_id}", status_code=204)
def delete_comment(comment_id: str):
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(400, "Invalid comment ID")
    db = get_db()
    comment = db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(404, "Comment not found")

    db.posts.update_one(
        {"_id": comment["postId"]},
        {"$inc": {"commentCount": -1}}
    )
    db.comments.delete_one({"_id": ObjectId(comment_id)})
