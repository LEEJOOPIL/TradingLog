# SPEC-UI-001 구현 계획

## 개요

본 계획은 KRW 환율 변환 표시 기능(SPEC-UI-001)을 3개 파일에 걸쳐 additive 방식으로 구현한다.
기존 N3–N6 수식과 로직은 일체 수정하지 않으며, 새로운 행과 카드만 추가한다.

---

## Phase 1: Menu.gs 수정 — `initSheet()` KRW 행 추가

### 대상

`Menu.gs` — `initSheet()` 함수

**[DELTA][MODIFY] Menu.gs `initSheet()`**

### 작업 내용

1. M열 레이블 설정 블록(Lines 96-102 근처)에 다음 2개 항목 추가:
   - `M7` ← `"총 평가금액(KRW)"`
   - `M8` ← `"환율(USD/KRW)"`

2. N열 수식 설정 블록(Lines 115-138 근처)에 다음 2개 수식 추가:
   - `N7` ← `=IFERROR(N4*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`
   - `N8` ← `=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`

3. 숫자 포맷 설정:
   - `N7`: `#,##0` (KRW는 소수점 없음)
   - `N8`: `#,##0` (환율도 정수 표시)

### 제약

- 기존 N3–N6 수식 블록에 손대지 않는다.
- `SUM_START_ROW`(=3) 상수가 이미 있으므로, N7은 `SUM_START_ROW + 4`, N8은 `SUM_START_ROW + 5`로 계산한다.

---

## 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| GOOGLEFINANCE 최대 20분 지연 | N7/N8 값이 최신이 아닐 수 있음 | `IFERROR(..., "-")` 폴백으로 오류 방지 |

---

## 구현 순서

Phase 1(Menu.gs)만 구현한다.
