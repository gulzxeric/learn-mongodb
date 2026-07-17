import logging
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId
from app.database import get_db
from app.schemas import TagCreate, TagUpdate
from app.exceptions import AppException

logger = logging.getLogger(__name__)


class TagService:
    def __init__(self):
        self.collection: Collection = get_db()["tags"]

    def list_all(self) -> list[dict]:
        return list(self.collection.find().sort("name", 1))

    def get_by_id(self, tag_id: str) -> dict:
        try:
            doc = self.collection.find_one({"_id": ObjectId(tag_id)})
        except InvalidId:
            raise AppException(400, "Invalid tag ID format")
        if not doc:
            raise AppException(404, "Tag not found")
        return doc

    def create(self, data: TagCreate) -> dict:
        if self.collection.find_one({"name": data.name}):
            raise AppException(409, "Tag name already exists")
        result = self.collection.insert_one(data.model_dump())
        return self.collection.find_one({"_id": result.inserted_id})

    def update(self, tag_id: str, data: TagUpdate) -> dict:
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(tag_id)},
                {"$set": data.model_dump(exclude_unset=True)},
            )
        except InvalidId:
            raise AppException(400, "Invalid tag ID format")
        if result.matched_count == 0:
            raise AppException(404, "Tag not found")
        return self.collection.find_one({"_id": ObjectId(tag_id)})

    def delete(self, tag_id: str):
        try:
            result = self.collection.delete_one({"_id": ObjectId(tag_id)})
        except InvalidId:
            raise AppException(400, "Invalid tag ID format")
        if result.deleted_count == 0:
            raise AppException(404, "Tag not found")

    def get_post_count(self, tag_id: str) -> int:
        return get_db()["posts"].count_documents({"tags": ObjectId(tag_id)})
