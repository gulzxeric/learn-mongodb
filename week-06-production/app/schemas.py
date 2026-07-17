from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.helpers import PyObjectId


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class TagUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class TagResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    slug: str = Field(..., min_length=1, max_length=50)


class CategoryUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    slug: str = Field(..., min_length=1, max_length=50)


class CategoryResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str
    slug: str

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=30)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=30)
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class UserResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    username: str
    email: str
    createdAt: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = ""
    authorId: str
    categoryId: str
    tags: list[str] = []
    published: bool = True


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    excerpt: Optional[str] = None
    categoryId: Optional[str] = None
    tags: Optional[list[str]] = None
    published: Optional[bool] = None


class PostResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    content: str
    excerpt: Optional[str] = ""
    authorId: PyObjectId
    categoryId: PyObjectId
    tags: list[PyObjectId]
    commentCount: int
    published: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class CommentCreate(BaseModel):
    postId: str
    authorId: str
    body: str = Field(..., min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    postId: PyObjectId
    authorId: PyObjectId
    body: str
    createdAt: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}
