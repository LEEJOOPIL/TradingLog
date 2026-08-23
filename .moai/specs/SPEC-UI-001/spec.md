---
id: SPEC-UI-001
version: "1.1.0"
status: closed
created: "2026-06-27"
updated: "2026-06-27"
author: pilsogood
priority: medium
issue_number: 0
---

# SPEC-UI-001 — KRW 환율 변환 표시 기능

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0.0 | 2026-06-27 | 최초 작성 | pilsogood |
| 1.1.0 | 2026-06-27 | REQ-005·REQ-006 철회: 웹앱 KRW 카드 및 `getPortfolioData()` KRW 필드 제거. 시트 N7/N8 수식(REQ-001~004)은 유지. status → closed | pilsogood |

---

## 개요

N열 종합 요약 섹션에 KRW(원화) 기준 총 평가금액과 USD/KRW 환율 행을 추가한다.
모든 변경은 기존 N3–N6 수식에 영향을 주지 않는 **additive only** 방식으로 구현한다.

---

## 배경

현재 TradingLog는 매입금액, 평가금액, 수익금액, 수익률을 모두 USD 기준으로만 표시한다.
사용자는 투자 현황을 원화(KRW)로도 파악할 필요가 있으며, 매번 환율을 수동으로 조회하는 불편이 있다.
GOOGLEFINANCE("CURRENCY:USDKRW") 수식은 금·은 가격 조회와 동일한 방식으로 실시간 환율을 제공하므로, 기존 아키텍처를 그대로 활용할 수 있다.

---

## 범위

### 포함 사항

- N7 행: KRW 총 평가금액 레이블(M7) 및 수식(N7) 추가
- N8 행: USD/KRW 환율 레이블(M8) 및 수식(N8) 추가

### 제외 사항 (Non-Goals)

- N3–N6 기존 수식 변경 없음
- KRW 기준 손절가(H열) 계산 추가 없음
- KRW 기준 수익률·수익금액 계산 없음
- 환율 자동 갱신 트리거 추가 없음 (기존 메뉴 함수로 충분)
- 모바일 전용 레이아웃 최적화 없음

---

## EARS 요구사항

### REQ-001 [UBIQ] 시트 요약 KRW 행 표시

> When the sheet is opened or initialized, the system shall display KRW total valuation in row N7 using the formula `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` and the USD/KRW exchange rate in row N8 using the formula `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`.

시트가 열리거나 초기화될 때, 시스템은 N7에 `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` 수식으로 KRW 총 평가금액을, N8에 `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")` 수식으로 USD/KRW 환율을 표시해야 한다.

### REQ-002 [EVENT] initSheet() 실행 시 M7/N7/M8/N8 추가

> When `initSheet()` is called, the system shall set M7 label to "총 평가금액(KRW)", N7 formula to `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`, M8 label to "환율(USD/KRW)", and N8 formula to `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`, without modifying any existing rows.

`initSheet()` 가 호출될 때, 시스템은 M7에 "총 평가금액(KRW)" 레이블, N7에 KRW 환산 수식, M8에 "환율(USD/KRW)" 레이블, N8에 환율 수식을 설정해야 하며, 기존 행은 수정하지 않아야 한다.

### REQ-003 [UNWANTED] 기존 N3–N6 수식 불변

> The system shall NOT modify, overwrite, or clear existing formulas in cells N3, N4, N5, or N6 when executing `initSheet()` or `updateAllFormulas()`.

`initSheet()` 또는 `updateAllFormulas()` 실행 시, 시스템은 기존 N3, N4, N5, N6 셀의 수식을 수정·덮어쓰기·삭제해서는 안 된다.

### REQ-004 [STATE] GOOGLEFINANCE 데이터 미수신 시 대체값 표시

> While GOOGLEFINANCE data is unavailable (e.g., market closed, API timeout), the system shall display "-" in cells N7 and N8 instead of an error value.

GOOGLEFINANCE 데이터를 수신할 수 없는 상태(장 마감, API 타임아웃 등)에서는, 시스템은 N7과 N8에 오류값 대신 "-"를 표시해야 한다.

---

## 변경 대상 파일

| 파일 | 변경 유형 | 대상 위치 |
|------|-----------|-----------|
| `Menu.gs` | [MODIFY] | `initSheet()` — M열 레이블 설정(Lines 96-102), N열 수식 설정(Lines 115-138) |
