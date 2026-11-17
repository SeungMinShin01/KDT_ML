package com.kdt.backend.service;

import java.io.IOException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.kdt.backend.model.dto.PredictDto;

import reactor.core.Disposable;

@Service
public class PredictService {

    // 1. FastAPI 예측 주소 (전체 경로) , application.properties 의 ai.server.url
    // 예) http://127.0.0.1:8000/api/predict
    @Value("${ai.server.url}")
    private String aiServerUrl;

    // 2. API 호출 라이브러리
    private final WebClient webClient = WebClient.builder().build();

    // 3. FastAPI SSE 응답 타입 : 이벤트 이름(event) + 내용(data , JSON --> Map)
    private static final ParameterizedTypeReference<ServerSentEvent<Map<String, Object>>> SSE_TYPE =
            new ParameterizedTypeReference<>() {};

    // [1] 예측 요청 --> SseEmitter 반환
    public SseEmitter predict(PredictDto predictDto) {
        SseEmitter emitter = new SseEmitter(60_000L); // 1) 연결 유지 60초

        // 2) 입력값 확인 , 잘못되면 FastAPI 를 부르지 않고 바로 error 이벤트
        String message = validate(predictDto);
        if (message != null) {
            sendError(emitter, "INVALID_PARAM", message);
            return emitter;
        }

        // 3) React 는 농촌 동을 "양평읍 양근리" 처럼 보냄 --> eupmyeon = "양평읍" , dong = "양근리" 로 나눔
        splitEupmyeon(predictDto);

        // 4) WebClient 로 FastAPI 스트리밍 호출 : POST 127.0.0.1:8000/api/predict , body = predictDto (JSON)
        Disposable subscription = webClient.post()
                .uri(aiServerUrl)
                .contentType(MediaType.APPLICATION_JSON)   // 보내는 형식 : JSON
                .accept(MediaType.TEXT_EVENT_STREAM)       // 받는 형식 : SSE 스트림
                .bodyValue(predictDto)                     // {"sido", "sigungu", "eupmyeon", "dong", "area", "floor"}
                .retrieve()
                .bodyToFlux(SSE_TYPE)                      // 이벤트를 하나씩 받음
                .filter(event -> event.data() != null)     // 연결 유지용 빈 신호(": ping" 등 data 없는 이벤트)는 건너뜀
                .timeout(Duration.ofSeconds(30))           // 이벤트 사이가 30초 넘게 비면 응답 없음으로 판단
                .subscribe(
                        // 5) 이벤트 하나 도착할 때마다 React 로 전달 (이름이 없으면 progress 로 봄)
                        event -> {
                            String eventName = event.event() == null ? "progress" : event.event();
                            send(emitter, eventName, toReactData(eventName, event.data(), predictDto.getArea()));
                        },
                        // 6) FastAPI 연결 실패 · 시간 초과 · 요청 거부
                        error -> {
                            System.out.println("AI 서버 오류 : " + error);
                            // FastAPI 가 4XX(예: 422 값 형식 오류)로 거부한 경우
                            if (error instanceof WebClientResponseException responseError
                                    && responseError.getStatusCode().is4xxClientError()) {
                                sendError(emitter, "INVALID_PARAM", "요청 값을 확인해 주세요");
                            } else {
                                sendError(emitter, "SERVER_UNAVAILABLE", "AI 서버에 연결할 수 없어요");
                            }
                        },
                        // 7) FastAPI 스트림이 끝나면 React 연결도 종료
                        emitter::complete);

        // 8) React 연결이 끊기면 FastAPI 요청도 함께 중단
        emitter.onCompletion(subscription::dispose);
        emitter.onTimeout(subscription::dispose);
        emitter.onError(error -> subscription.dispose());

        return emitter;
    }

    // [2] 입력값 확인 , 문제 없으면 null
    private String validate(PredictDto dto) {
        if (dto.getSido() == null || dto.getSido().isBlank()) return "시도를 선택해 주세요";
        if (dto.getSigungu() == null || dto.getSigungu().isBlank()) return "시군구를 선택해 주세요";
        if (dto.getDong() == null || dto.getDong().isBlank()) return "법정동을 선택해 주세요";
        if (dto.getArea() == null || dto.getArea() <= 0) return "전용면적을 확인해 주세요";
        if (dto.getFloor() == null) return "층을 입력해 주세요";
        return null;
    }

    // [3] "양평읍 양근리" --> eupmyeon = "양평읍" , dong = "양근리" / 도시 "청운동" --> eupmyeon = ""
    private void splitEupmyeon(PredictDto dto) {
        if (dto.getEupmyeon() != null && !dto.getEupmyeon().isBlank()) return; // 이미 나눠져 있으면 그대로
        int space = dto.getDong().lastIndexOf(' ');
        if (space < 0) {
            dto.setEupmyeon("");
            return;
        }
        dto.setEupmyeon(dto.getDong().substring(0, space));
        dto.setDong(dto.getDong().substring(space + 1));
    }

    // [4] FastAPI data --> React 가 읽는 data (이벤트 이름은 그대로 , data 에 step 을 붙임)
    private Map<String, Object> toReactData(String event, Map<String, Object> data, double area) {
        Map<String, Object> out = new LinkedHashMap<>();
        if ("result".equals(event)) {
            long price = ((Number) data.get("price")).longValue(); // 수십억 원 --> long
            out.put("step", "done");
            out.put("prediction", price);
            out.put("priceText", data.get("priceText"));
            out.put("pricePerM2", Math.round(price / area));       // ㎡당 가격
            out.put("r2", data.get("r2"));
            out.put("model", "LightGBM");
        } else if ("error".equals(event)) {
            out.put("step", "error");
            out.putAll(data);
        } else {
            out.putAll(data); // progress : step , message 그대로
        }
        return out;
    }

    // [5] React 로 이벤트 한 개 보내기
    private void send(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException e) {
            emitter.complete(); // React 연결이 끊긴 경우
        }
    }

    // [6] error 이벤트 보내고 연결 종료
    private void sendError(SseEmitter emitter, String code, String message) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("step", "error");
        data.put("code", code);
        data.put("message", message);
        send(emitter, "error", data);
        emitter.complete();
    }
}
