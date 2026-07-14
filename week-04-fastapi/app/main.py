from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import close_db
from app.routers import tags, categories, users, posts, comments, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    print('启动时执行')
    yield
    print('关闭前执行')
    close_db()


app = FastAPI(title="Blog CMS API", version="1.0.0", lifespan=lifespan)

app.include_router(tags.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"message": "Blog CMS API", "docs": "/docs"}
