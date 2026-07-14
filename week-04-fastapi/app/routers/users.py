from fastapi import APIRouter, HTTPException
from bson import ObjectId
from app.database import get_db
from app.schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users():
    db = get_db()
    users = db.users.find().sort("username", 1)
    return [UserResponse(**u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(400, "Invalid user ID")
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse(**user)


@router.post("", response_model=UserResponse, status_code=201)
def create_user(body: UserCreate):
    db = get_db()
    doc = body.model_dump()
    doc["createdAt"] = __import__("datetime").datetime.now()
    result = db.users.insert_one(doc)
    user = db.users.find_one({"_id": result.inserted_id})
    return UserResponse(**user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, body: UserUpdate):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(400, "Invalid user ID")
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")
    db = get_db()
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return UserResponse(**user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(400, "Invalid user ID")
    db = get_db()
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
