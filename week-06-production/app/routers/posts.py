import logging
from fastapi import APIRouter, Depends
from app.services.post_service import PostService
from app.services.tag_service import TagService
from app.schemas import PostCreate, PostUpdate, PostResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/posts", tags=["posts"])


def get_post_service() -> PostService:
    return PostService()


@router.get("", response_model=dict)
def list_posts(
    page: int = 1,
    page_size: int = 10,
    author_id: str | None = None,
    category_id: str | None = None,
    tag_id: str | None = None,
    published: bool | None = None,
    search: str | None = None,
    service: PostService = Depends(get_post_service),
):
    from bson import ObjectId
    from app.database import get_db

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
def get_post(post_id: str, service: PostService = Depends(get_post_service)):
    return service.get_by_id(post_id)


@router.post("", response_model=PostResponse, status_code=201)
def create_post(body: PostCreate, service: PostService = Depends(get_post_service)):
    return service.create(body)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(post_id: str, body: PostUpdate, service: PostService = Depends(get_post_service)):
    return service.update(post_id, body)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: str, service: PostService = Depends(get_post_service)):
    service.delete(post_id)
