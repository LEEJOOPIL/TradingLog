# Research: KRW 환율 변환 기능

## 현재 N열 요약 구조

| 행 | M열 (레이블) | N열 (값) | 수식 |
|----|-------------|---------|------|
| N3 | 총 매입금액 | USD | `=SUMPRODUCT((B2:B1000<>"")*IFERROR(VALUE(E2:E1000),0))` |
| N4 | 총 평가금액 | USD | `=SUMPRODUCT(오픈포지션: F×D) + SUMPRODUCT(손절실현: H×D)` |
| N5 | 총 수익금액 | USD | `=N4-N3` |
| N6 | 종합 수익률 | % | `=IF(N3=0,0,(N4-N3)/N3*100)` |

- SUM_START_ROW = 3, SUM_LABEL_COL = 13(M), SUM_VAL_COL = 14(N)
- 요약 헤더: M1-N1 머지 셀 "📈 종합 요약 (✅ = 손절 실현)"

## 추가 대상 행

| 행 | M열 (레이블) | N열 (값) | 수식 |
|----|-------------|---------|------|
| N7 | 총 평가금액(KRW) | KRW | `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` |
| N8 | 환율(USD/KRW) | KRW | `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` |

## GOOGLEFINANCE 환율 수식 패턴

- USD/KRW: `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`
- N7 KRW 총평가: `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`
- 숫자 포맷: `#,##0` (KRW는 소수점 없음)

## 영향 받는 파일 (Menu.gs)

- `initSheet()` 함수 Lines 96-102: M열 레이블 설정 위치
- `initSheet()` 함수 Lines 115-138: N열 수식 설정 위치
- Lines 140-149: 조건부 서식 (N5, N6에만 적용)

## 제약사항

- GOOGLEFINANCE 데이터는 최대 20분 지연 가능
- `UrlFetchApp`은 커스텀 함수 불가 → GOOGLEFINANCE 수식 방식으로 충분

## 권장 구현 방식

**시트 레벨**: Menu.gs `initSheet()`에 M7/N7, M8/N8 추가 (additive, 기존 N3-N6 불변)
