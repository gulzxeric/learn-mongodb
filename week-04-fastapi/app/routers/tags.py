from fastapi import APIRouter, HTTPException
from bson import ObjectId
from app.database import get_db
from app.schemas import TagCreate, TagUpdate, TagResponse

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
def list_tags():
    db = get_db()
    tags = db.tags.find().sort("name", 1)
    return [TagResponse(**t) for t in tags]


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: str):
    if not ObjectId.is_valid(tag_id):
        raise HTTPException(400, "Invalid tag ID")
    db = get_db()
    tag = db.tags.find_one({"_id": ObjectId(tag_id)})
    if not tag:
        raise HTTPException(404, "Tag not found")
    return TagResponse(**tag)


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(body: TagCreate):
    db = get_db()
    result = db.tags.insert_one(body.model_dump())
    tag = db.tags.find_one({"_id": result.inserted_id})
    return TagResponse(**tag)


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: str, body: TagUpdate):
    if not ObjectId.is_valid(tag_id):
        raise HTTPException(400, "Invalid tag ID")
    db = get_db()
    result = db.tags.update_one(
        {"_id": ObjectId(tag_id)},
        {"$set": body.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Tag not found")
    tag = db.tags.find_one({"_id": ObjectId(tag_id)})
    return TagResponse(**tag)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: str):
    if not ObjectId.is_valid(tag_id):
        raise HTTPException(400, "Invalid tag ID")
    db = get_db()
    result = db.tags.delete_one({"_id": ObjectId(tag_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Tag not found")
