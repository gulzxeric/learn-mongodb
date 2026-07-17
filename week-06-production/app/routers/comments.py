import logging
from fastapi import APIRouter, Depends
from app.services.comment_service import CommentService
from app.schemas import CommentCreate, CommentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comments", tags=["comments"])


def get_comment_service() -> CommentService:
    return CommentService()


@router.get("", response_model=dict)
def list_comments(
    post_id: str | None = None,
    page: int = 1,
    page_size: int = 10,
    service: CommentService = Depends(get_comment_service),
):
    if post_id:
        docs = service.list_by_post(post_id)
        total = len(docs)
        items = [CommentResponse(**c) for c in docs]
        return {"items": items, "total": total, "page": 1, "page_size": total or 1}
    from app.database import get_db
    db = get_db()
    total = db.comments.count_documents({})
    comments = (
        db.comments.find({})
        .sort("createdAt", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [CommentResponse(**c) for c in comments]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{comment_id}", response_model=CommentResponse)
def get_comment(comment_id: str):
    from bson import ObjectId
    from bson.errors import InvalidId
    from app.database import get_db
    from app.exceptions import AppException

    try:
        db = get_db()
        comment = db.comments.find_one({"_id": ObjectId(comment_id)})
    except InvalidId:
        raise AppException(400, "Invalid comment ID format")
    if not comment:
        raise AppException(404, "Comment not found")
    return CommentResponse(**comment)


@router.post("", response_model=CommentResponse, status_code=201)
def create_comment(body: CommentCreate, service: CommentService = Depends(get_comment_service)):
    return service.create(body)


@router.delete("/{comment_id}", status_code=204)
def delete_comment(comment_id: str, service: CommentService = Depends(get_comment_service)):
    service.delete(comment_id)
