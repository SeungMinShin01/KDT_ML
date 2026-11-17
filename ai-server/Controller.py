# 라우터: 특정 도메인(주소) 묶어주는 역할
from fastapi import APIRouter
router = APIRouter( prefix="/api" )

# 서비스 객체 불러오기
from Service import house_service

# 예측
# POST http://127.0.0.1:8000/api/predict
# 본문 : {"sido":"서울특별시","sigungu":"강남구","dong":"역삼동","area":84.9,"floor":10}
@router.post( "/predict" )
async def predict( item: dict ) :
    return house_service.predict( item )