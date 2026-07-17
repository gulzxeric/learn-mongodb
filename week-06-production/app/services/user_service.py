import logging
from datetime import datetime
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId
from app.database import get_db
from app.schemas import UserCreate, UserUpdate
from app.exceptions import AppException

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self):
        self.collection: Collection = get_db()["users"]

    def list_all(self) -> list[dict]:
        return list(self.collection.find().sort("username", 1))

    def get_by_id(self, user_id: str) -> dict:
        try:
            doc = self.collection.find_one({"_id": ObjectId(user_id)})
        except InvalidId:
            raise AppException(400, "Invalid user ID format")
        if not doc:
            raise AppException(404, "User not found")
        return doc

    def create(self, data: UserCreate) -> dict:
        if self.collection.find_one({"email": data.email}):
            raise AppException(409, "Email already exists")
        now = datetime.utcnow()
        user_doc = data.model_dump() | {"createdAt": now}
        result = self.collection.insert_one(user_doc)
        return self.collection.find_one({"_id": result.inserted_id})

    def update(self, user_id: str, data: UserUpdate) -> dict:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            raise AppException(400, "No fields to update")
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data},
            )
        except InvalidId:
            raise AppException(400, "Invalid user ID format")
        if result.matched_count == 0:
            raise AppException(404, "User not found")
        return self.collection.find_one({"_id": ObjectId(user_id)})

    def delete(self, user_id: str):
        try:
            result = self.collection.delete_one({"_id": ObjectId(user_id)})
        except InvalidId:
            raise AppException(400, "Invalid user ID format")
        if result.deleted_count == 0:
            raise AppException(404, "User not found")
