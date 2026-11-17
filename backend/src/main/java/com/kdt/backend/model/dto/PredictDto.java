package com.kdt.backend.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// 예측 요청 값 (React --> Spring) , POST /api/predict 의 body
// {"sido": "경기도", "sigungu": "양평군", "dong": "양평읍 양근리", "area": 84.9, "floor": 10}
@NoArgsConstructor @AllArgsConstructor @Builder @Data
public class PredictDto {
    private String sido;       // 시도
    private String sigungu;    // 시군구
    private String eupmyeon;   // 읍면 (React 는 보내지 않음 , dong 에서 나눠서 채움 / 도시는 "")
    private String dong;       // 동리 (농촌은 "양평읍 양근리" 처럼 읍면이 붙어서 옴)
    private Double area;       // 전용면적 (㎡)
    private Integer floor;     // 층 , 지하는 음수
}
