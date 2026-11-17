package com.kdt.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.kdt.backend.model.dto.PredictDto;
import com.kdt.backend.service.PredictService;

import lombok.RequiredArgsConstructor;

// Chapter 2 : 예측 요청 --> FastAPI SSE 를 React 로 실시간 중계
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PredictController {

    private final PredictService predictService;

    // 1. 예측 : POST /api/predict  body {"sido", "sigungu", "dong", "area", "floor"}
    // * 응답 Content-type JSON 이 아닌 EVENT_STREAM 타입
    @PostMapping(value = "/predict", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter predict(@RequestBody PredictDto predictDto) {
        return predictService.predict(predictDto);
    }
}
