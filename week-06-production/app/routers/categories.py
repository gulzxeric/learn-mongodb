import logging
from fastapi import APIRouter, Depends
from app.services.category_service import CategoryService
from app.schemas import CategoryCreate, CategoryUpdate, CategoryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["categories"])


def get_category_service() -> CategoryService:
    return CategoryService()


@router.get("", response_model=list[CategoryResponse])
def list_categories(service: CategoryService = Depends(get_category_service)):
    docs = service.list_all()
    for d in docs:
        d["postCount"] = service.get_post_count(str(d["_id"]))
    return docs


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: str, service: CategoryService = Depends(get_category_service)):
    return service.get_by_id(category_id)


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, service: CategoryService = Depends(get_category_service)):
    return service.create(data)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: str, data: CategoryUpdate, service: CategoryService = Depends(get_category_service)):
    return service.update(category_id, data)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: str, service: CategoryService = Depends(get_category_service)):
    service.delete(category_id)
