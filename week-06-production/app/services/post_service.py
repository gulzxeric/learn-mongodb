import logging
from datetime import datetime
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId
from app.database import get_db
from app.schemas import PostCreate, PostUpdate
from app.exceptions import AppException

logger = logging.getLogger(__name__)


class PostService:
    def __init__(self):
        self.collection: Collection = get_db()["posts"]

    def list_all(self, page: int = 1, per_page: int = 10, published: bool | None = None) -> tuple[list[dict], int]:
        query = {}
        if published is not None:
            query["published"] = published
        total = self.collection.count_documents(query)
        skip = (page - 1) * per_page
        docs = list(
            self.collection.find(query)
            .sort("createdAt", -1)
            .skip(skip)
            .limit(per_page)
        )
        return docs, total

    def get_by_id(self, post_id: str) -> dict:
        try:
            doc = self.collection.find_one({"_id": ObjectId(post_id)})
        except InvalidId:
            raise AppException(400, "Invalid post ID format")
        if not doc:
            raise AppException(404, "Post not found")
        return doc

    def create(self, data: PostCreate) -> dict:
        self._validate_refs(data.authorId, data.categoryId, data.tags)
        now = datetime.utcnow()
        post_doc = data.model_dump() | {
            "commentCount": 0,
            "createdAt": now,
            "updatedAt": now,
        }
        post_doc["authorId"] = ObjectId(data.authorId)
        post_doc["categoryId"] = ObjectId(data.categoryId)
        post_doc["tags"] = [ObjectId(t) for t in data.tags]
        result = self.collection.insert_one(post_doc)
        return self.collection.find_one({"_id": result.inserted_id})

    def update(self, post_id: str, data: PostUpdate) -> dict:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            raise AppException(400, "No fields to update")
        if "categoryId" in update_data:
            update_data["categoryId"] = ObjectId(update_data["categoryId"])
        if "tags" in update_data:
            update_data["tags"] = [ObjectId(t) for t in update_data["tags"]]
        update_data["updatedAt"] = datetime.utcnow()
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": update_data},
            )
        except InvalidId:
            raise AppException(400, "Invalid post ID format")
        if result.matched_count == 0:
            raise AppException(404, "Post not found")
        return self.collection.find_one({"_id": ObjectId(post_id)})

    def delete(self, post_id: str):
        try:
            result = self.collection.delete_one({"_id": ObjectId(post_id)})
        except InvalidId:
            raise AppException(400, "Invalid post ID format")
        if result.deleted_count == 0:
            raise AppException(404, "Post not found")
        get_db()["comments"].delete_many({"postId": ObjectId(post_id)})

    def _validate_refs(self, author_id: str, category_id: str, tags: list[str]):
        db = get_db()
        if not db["users"].find_one({"_id": ObjectId(author_id)}):
            raise AppException(400, "Author not found")
        if not db["categories"].find_one({"_id": ObjectId(category_id)}):
            raise AppException(400, "Category not found")
        for tag_id in tags:
            if not db["tags"].find_one({"_id": ObjectId(tag_id)}):
                raise AppException(400, f"Tag {tag_id} not found")
