# SPEC-UI-001 Compact — KRW 환율 변환 표시

## REQ 목록

| ID | 유형 | 요약 |
|----|------|------|
| REQ-001 | UBIQ | 시트 열람/초기화 시 N7에 KRW 총 평가금액, N8에 환율 수식 표시 |
| REQ-002 | EVENT | `initSheet()` 호출 시 M7/N7/M8/N8 레이블 및 수식 설정 |
| REQ-003 | UNWANTED | `initSheet()` / `updateAllFormulas()` 실행 시 N3–N6 수식 불변 |
| REQ-004 | STATE | GOOGLEFINANCE 미수신 시 N7/N8에 "-" 표시 |

---

## 수식 정의

| 셀 | 수식 | 포맷 |
|----|------|------|
| N7 | `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` | `#,##0` |
| N8 | `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` | `#,##0` |

---

## 인수 기준 (Given/When/Then)

**시나리오 1: 시트 초기화 시 KRW 행 존재**
- Given: M7, N7, M8, N8 셀이 비어 있음
- When: "🛠 시트 초기화" 메뉴 실행
- Then: M7="총 평가금액(KRW)", M8="환율(USD/KRW)", N7/N8에 GOOGLEFINANCE 수식 설정됨

**시나리오 2: N7 수식 계산 정확성**
- Given: N4에 유효한 USD 값, GOOGLEFINANCE 데이터 수신 가능
- When: 시트 갱신 또는 수식 전체 갱신 실행
- Then: N7 = N4 × N8, `#,##0` 포맷 적용됨

**시나리오 3: GOOGLEFINANCE 오류 시 대체값**
- Given: GOOGLEFINANCE("CURRENCY:USDKRW")가 오류 반환
- When: N7 또는 N8 수식 평가
- Then: N7, N8에 "#N/A" 등 오류값 대신 "-" 표시됨

**시나리오 4: 기존 N3–N6 불변**
- Given: N3–N6에 기존 수식이 설정됨
- When: `initSheet()` 또는 `updateAllFormulas()` 실행
- Then: N3, N4, N5, N6 수식 내용 변경 없음


---

## 변경 대상 파일

| 파일 | 변경 유형 | 대상 |
|------|-----------|------|
| `Menu.gs` | [DELTA][MODIFY] | `initSheet()` — M7/N7/M8/N8 추가 |

---

## Non-Goals

- N3–N6 기존 수식 변경 없음
- KRW 기준 손절가 계산 없음
- KRW 기준 수익률·수익금액 계산 없음
- 환율 자동 갱신 트리거 없음
- 모바일 전용 레이아웃 최적화 없음
