import logging
from pymongo import MongoClient
from pymongo.database import Database
from app.config import settings

logger = logging.getLogger(__name__)

client: MongoClient | None = None


def get_client() -> MongoClient:
    global client
    if client is None:
        client = MongoClient(settings.MONGO_URI)
    return client


def get_db() -> Database:
    return get_client()[settings.DATABASE_NAME]


def close_db():
    global client
    if client:
        client.close()
        client = None


def verify_db_connection():
    try:
        get_client().admin.command("ping")
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.critical("MongoDB connection failed: %s", e)
        raise RuntimeError(f"Cannot connect to MongoDB: {e}") from e
