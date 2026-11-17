from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter( prefix="/api" )

from Service import house_service

@router.post( "/predict" )
async def predict( item: dict ) :
    # 응답 형식 : JSON 이 아닌 text/event-stream (SSE)
    return StreamingResponse( house_service.predict_stream( item ) , media_type="text/event-stream" )