from fastapi import APIRouter, HTTPException
from bson import ObjectId
from app.database import get_db
from app.schemas import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories():
    db = get_db()
    cats = db.categories.find().sort("name", 1)
    return [CategoryResponse(**c) for c in cats]


@router.get("/{cat_id}", response_model=CategoryResponse)
def get_category(cat_id: str):
    if not ObjectId.is_valid(cat_id):
        raise HTTPException(400, "Invalid category ID")
    db = get_db()
    cat = db.categories.find_one({"_id": ObjectId(cat_id)})
    if not cat:
        raise HTTPException(404, "Category not found")
    return CategoryResponse(**cat)


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(body: CategoryCreate):
    db = get_db()
    result = db.categories.insert_one(body.model_dump())
    cat = db.categories.find_one({"_id": result.inserted_id})
    return CategoryResponse(**cat)


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: str, body: CategoryUpdate):
    if not ObjectId.is_valid(cat_id):
        raise HTTPException(400, "Invalid category ID")
    db = get_db()
    result = db.categories.update_one(
        {"_id": ObjectId(cat_id)},
        {"$set": body.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Category not found")
    cat = db.categories.find_one({"_id": ObjectId(cat_id)})
    return CategoryResponse(**cat)


@router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: str):
    if not ObjectId.is_valid(cat_id):
        raise HTTPException(400, "Invalid category ID")
    db = get_db()
    result = db.categories.delete_one({"_id": ObjectId(cat_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Category not found")
