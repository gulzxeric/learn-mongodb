import logging
from fastapi import APIRouter, Depends
from app.services.user_service import UserService
from app.schemas import UserCreate, UserUpdate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service() -> UserService:
    return UserService()


@router.get("", response_model=list[UserResponse])
def list_users(service: UserService = Depends(get_user_service)):
    return service.list_all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, service: UserService = Depends(get_user_service)):
    return service.get_by_id(user_id)


@router.post("", response_model=UserResponse, status_code=201)
def create_user(data: UserCreate, service: UserService = Depends(get_user_service)):
    return service.create(data)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, data: UserUpdate, service: UserService = Depends(get_user_service)):
    return service.update(user_id, data)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, service: UserService = Depends(get_user_service)):
    service.delete(user_id)
