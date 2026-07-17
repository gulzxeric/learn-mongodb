import logging
from fastapi import APIRouter, Depends, Query
from app.services.tag_service import TagService
from app.schemas import TagCreate, TagUpdate, TagResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tags", tags=["tags"])


def get_tag_service() -> TagService:
    return TagService()


@router.get("", response_model=list[TagResponse])
def list_tags(service: TagService = Depends(get_tag_service)):
    docs = service.list_all()
    for d in docs:
        d["postCount"] = service.get_post_count(str(d["_id"]))
    return docs


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: str, service: TagService = Depends(get_tag_service)):
    return service.get_by_id(tag_id)


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(data: TagCreate, service: TagService = Depends(get_tag_service)):
    return service.create(data)


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: str, data: TagUpdate, service: TagService = Depends(get_tag_service)):
    return service.update(tag_id, data)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: str, service: TagService = Depends(get_tag_service)):
    service.delete(tag_id)
