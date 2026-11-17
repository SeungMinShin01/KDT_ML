import os
import json
import asyncio
import numpy as np
import pandas as pd
import joblib

# 이 파일(Service.py)이 있는 폴더 기준으로 models 폴더 찾기
BASE_DIR = os.path.dirname( os.path.abspath( __file__ ) )
MODEL_DIR = os.path.join( BASE_DIR , 'models' )

num_cols = ['전용면적', '층']        # 학습 때와 같은 순서
cat_cols = ['시군구', '법정동']

class HouseService :

    def __init__( self ) :
        self.models = { }        
        self.metrics = { }       
        for sido in ['서울특별시', '경기도'] :
            model_path = os.path.join( MODEL_DIR , f'model_{sido}.pkl' )
            metrics_path = os.path.join( MODEL_DIR , f'metrics_{sido}.pkl' )
            if os.path.exists( model_path ) :
                self.models[sido] = joblib.load( model_path )
                self.metrics[sido] = joblib.load( metrics_path )
                print( '모델 로드 :' , sido , self.metrics[sido].get('test_r2') )

    # 예측
    def predict( self , item ) :
        sido = item.get( 'sido' )
        if sido not in self.models :
            return { 'error' : '지원하지 않는 지역입니다' }

        sample = pd.DataFrame( [ {
            '전용면적' : float( item['area'] ) ,
            '층'       : int( item['floor'] ) ,
            '시군구'   : item['sigungu'] ,
            '법정동'   : item['dong'] ,
        } ] )
        for col in cat_cols :
            sample[col] = sample[col].astype( 'category' )
        sample = sample[ num_cols + cat_cols ]

        # 예측 : log 로 학습했으므로 np.expm1 로 원래 가격(원) 복원
        pred = float( np.expm1( self.models[sido].predict( sample )[0] ) )

        # 결과, 모델 성능 지표(R2)
        return {
            'prediction' : round( pred ) ,                          # 예상 공시가격 (원)
            'pricePerM2' : round( pred / float( item['area'] ) ) ,  # ㎡당 가격 (원)
            'r2' : self.metrics[sido]['test_r2'] ,                  # 테스트 R² (원 단위)
            'model' : sido ,
        }
   # SSE 이벤트 한 개 만들기 :  "data: {json}\n\n"
    def to_sse( self , data ) :
        return 'data: ' + json.dumps( data , ensure_ascii=False ) + '\n\n'

    # 예측을 SSE 이벤트로 나눠서 보내기
    async def predict_stream( self , item ) :
        # 모델 선택 알림
        yield self.to_sse( { 'step' : 'model' , 'message' : f"{ item.get('sido') } 모델 선택" } )
        await asyncio.sleep( 0.3 )

        # 추론 시작 알림
        yield self.to_sse( { 'step' : 'predict' , 'message' : 'LightGBM 추론 중' } )
        await asyncio.sleep( 0.3 )

        # 실제 예측 (기존 predict 재사용)
        result = self.predict( item )
        if 'error' in result :
            yield self.to_sse( { 'step' : 'error' , 'message' : result['error'] } )
            return

        # 결과
        result['step'] = 'done'
        yield self.to_sse( result )


# 서비스 객체 생성
house_service = HouseService()

# 서비스 객체 생성
house_service = HouseService()