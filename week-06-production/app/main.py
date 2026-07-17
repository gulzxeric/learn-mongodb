from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import close_db, verify_db_connection
from app.logging_conf import setup_logging
from app.exceptions import AppException, app_exception_handler, global_exception_handler
from app.routers import tags, categories, users, posts, comments, stats, health

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.LOG_LEVEL)
    logger.info("Starting Blog CMS API")
    verify_db_connection()
    yield
    logger.info("Shutting down")
    close_db()


app = FastAPI(title="Blog CMS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(tags.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(stats.router)
app.include_router(health.router)


@app.get("/")
def root():
    return {"message": "Blog CMS API", "docs": "/docs"}
