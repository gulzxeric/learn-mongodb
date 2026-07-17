import logging
from datetime import datetime
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId
from app.database import get_db
from app.schemas import CommentCreate
from app.exceptions import AppException

logger = logging.getLogger(__name__)


class CommentService:
    def __init__(self):
        self.collection: Collection = get_db()["comments"]

    def list_by_post(self, post_id: str) -> list[dict]:
        try:
            docs = list(
                self.collection.find({"postId": ObjectId(post_id)})
                .sort("createdAt", 1)
            )
        except InvalidId:
            raise AppException(400, "Invalid post ID format")
        return docs

    def create(self, data: CommentCreate) -> dict:
        try:
            post = get_db()["posts"].find_one({"_id": ObjectId(data.postId)})
        except InvalidId:
            raise AppException(400, "Invalid post ID format")
        if not post:
            raise AppException(404, "Post not found")
        try:
            user = get_db()["users"].find_one({"_id": ObjectId(data.authorId)})
        except InvalidId:
            raise AppException(400, "Invalid author ID format")
        if not user:
            raise AppException(404, "Author not found")
        now = datetime.utcnow()
        comment_doc = {
            "postId": ObjectId(data.postId),
            "authorId": ObjectId(data.authorId),
            "body": data.body,
            "createdAt": now,
        }
        result = self.collection.insert_one(comment_doc)
        get_db()["posts"].update_one(
            {"_id": ObjectId(data.postId)},
            {"$inc": {"commentCount": 1}},
        )
        return self.collection.find_one({"_id": result.inserted_id})

    def delete(self, comment_id: str):
        try:
            comment = self.collection.find_one({"_id": ObjectId(comment_id)})
        except InvalidId:
            raise AppException(400, "Invalid comment ID format")
        if not comment:
            raise AppException(404, "Comment not found")
        self.collection.delete_one({"_id": ObjectId(comment_id)})
        get_db()["posts"].update_one(
            {"_id": comment["postId"]},
            {"$inc": {"commentCount": -1}},
        )
