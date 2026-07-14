from pymongo import MongoClient
from app.config import MONGO_URI, DATABASE_NAME

client: MongoClient | None = None


def get_db():
    global client
    if client is None:
        client = MongoClient(MONGO_URI)
    return client[DATABASE_NAME]


def close_db():
    global client
    if client:
        client.close()
        client = None
