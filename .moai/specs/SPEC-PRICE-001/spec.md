---
id: SPEC-PRICE-001
title: 바이낸스 현물가 조회 버튼 (값 가져오기)
version: "1.2.0"
status: completed
created: "2026-08-23"
updated: "2026-08-25"
author: pilsogood
priority: medium
phase: "v1.2.0 target"
module: price-fetch
lifecycle: spec-anchored
tags: "binance, price, assettypes, webapp, external-api"
issue_number: 0
---

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0.0 | 2026-08-23 | 최초 작성 (Context-First Discovery 4개 요구사항 확정 반영) | pilsogood |
| 1.1.0 | 2026-08-23 | §3.6 가격 정밀도 추가 — REQ-023(둘째 자리 반올림, 서버 적용), REQ-024(0 붕괴 차단), REQ-025(수동 입력 불변). §4 제약·§5 성공 기준 반영 | pilsogood |
| 1.2.0 | 2026-08-25 | 실기 사용자 테스트 중 발견된 구글 클라우드 IP 지역/접근 차단 문제로 조회 아키텍처를 서버→클라이언트 직접 호출로 변경 (§2.5 신설, §3.3 재작성, §3.6.1 재작성, REQ-023 위치 갱신, §4 플랫폼 제약 갱신, §6 대체 호스트 폴백 배제 항목 부분 축소) | pilsogood |

---

# SPEC-PRICE-001 — 바이낸스 현물가 조회 버튼 (값 가져오기)

## 1. 배경 및 목적

현재 TradingLog는 모든 자산의 현재가를 사용자가 손으로 입력한다. 암호화폐처럼 가격이 자주 바뀌는 자산은 매번 외부 시세를 확인해 옮겨 적어야 하므로 번거롭고 오타 위험이 있다.

이 SPEC은 **현재가 설정 패널**에 자산별 "값 가져오기" 버튼을 추가해, 바이낸스 공개 현물 시세를 조회해 **입력 필드에만** 채워 넣는다. 실제 시트 반영은 기존과 동일하게 사용자가 "적용" 버튼을 눌러야 일어난다 — 조회와 반영을 분리한 2단계 확인 흐름을 의도적으로 유지한다.

이 SPEC은 이 프로젝트의 **첫 외부 API 연동**이다.

## 2. 범위 결정 사항 (명시)

### 2.1 심볼 저장 위치 — AssetTypes 시트 B열

자산-심볼 매핑은 `Code.gs`의 하드코딩 맵이 아니라 `AssetTypes` 시트 **B열("바이낸스 심볼")** 에 저장한다. 사용자가 자산 관리 패널에서 자유롭게 자산을 추가할 수 있으므로, 하드코딩 맵은 사용자 정의 자산(예: XRP)을 영영 지원하지 못한다.

심볼은 **선택 값(nullable)** 이다. 바이낸스 현물 페어가 없는 자산은 비워 둔다.

### 2.2 심볼 입력 방식 — 전용 수정 경로 (`setAssetSymbol`)

심볼 입력은 **자산 추가 시점이 아니라 자산 관리 패널의 심볼 수정 동작**으로 처리한다.

이 선택의 근거:

- 기본 7종 자산(금·은·비트코인·이더리움·솔라나·USDT·USDC)과 이 SPEC 이전에 사용자가 추가한 자산은 **이미 존재하므로 추가 시점이 없다**. 추가-시점-전용 설계는 이들에게 심볼을 넣을 방법을 남기지 않는다.
- 수정 경로 하나만 두면 `addAssetType(name)` 시그니처가 그대로 유지되어 호출부 변경이 발생하지 않는다.
- 신규·기존·기본 자산이 모두 동일한 단일 쓰기 경로를 쓴다.

**대안 기각**: "자산 추가 시 심볼 입력란 추가" 안은 위의 기존 자산 공백 문제 때문에 기각. "추가 시 입력 + 수정 둘 다" 안은 쓰기 경로가 둘로 늘어나는 데 비해 이득이 없어 기각.

### 2.3 `getAssetTypes()` 시그니처 — 변경하지 않음

`getAssetTypes()`는 `@MX:ANCHOR fan_in=4` 함수다. 반환 형식을 `string[]` → `{name, symbol}[]`로 바꾸면 서버 4개 호출부와 클라이언트 3개 렌더 함수가 함께 흔들린다.

대신 A:B 두 열을 한 번에 읽는 내부 리더 `readAssetRows_()`를 신설하고, `getAssetTypes()`는 그 결과에서 이름만 뽑아 주는 얇은 래퍼로 만든다. **외부 시그니처는 그대로**이므로 fan-in 파급이 0이 된다. 심볼은 `getPortfolioData()` 응답에 필드 하나를 **추가**하는 방식으로 클라이언트에 전달한다(기존 필드 불변).

### 2.4 정책 문서 갱신

`CLAUDE.md` 및 `.moai/project/tech.md`의 "가격 소스: 전 자산 수동 입력 — 외부 API·GOOGLEFINANCE 사용 안 함" 문장은 이 SPEC 이후 사실과 어긋난다. 갱신 대상으로 기록한다. 실제 문서 편집은 sync 단계에서 manager-docs가 수행한다(plan.md §H 참조).

### 2.5 아키텍처 변경 — 바이낸스 조회를 서버에서 클라이언트로 이전 (2026-08-25, 실기 테스트 중 발견)

v1.0.0/v1.1.0은 바이낸스 조회를 서버 함수(`Code.gs`의 `fetchBinancePrice`, `UrlFetchApp.fetch` 사용)로 계획했다(§3.3 원안 참조). run-phase 구현 완료 보고(2026-08-23) 이후 사용자가 실제로 배포한 웹앱에서 실기 테스트를 진행하는 과정에서, 이 계획이 다음 순서로 무너졌다(모두 2026-08-25 실측 — 전체 경위와 커밋 단위 증거는 `progress.md`의 "후속 수정" 절 4건에 시간순으로 기록되어 있고, 실측 데이터의 기술적 배경은 `research.md` §8에 정리되어 있다):

1. `api.binance.com`(원래 계획된 호스트) — Google Apps Script 실행 컨텍스트(Google 클라우드 서버 IP에서 발신)에서 지속적으로 **HTTP 451**(지역 차단, `"Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms."`) 반환.
2. 공개 미러 `data-api.binance.vision`(research.md §2.4에 1순위 대안으로 이미 조사되어 있던 호스트)으로 전환 → 데스크톱 Chrome 세션에서는 해결됐으나, **동일 사용자·동일 배포 웹앱 URL의 Android Chrome 세션**에서 지속적으로 **HTTP 403**이 재현됨(우발적이 아니라 재시도로도 해소되지 않는 재현 가능한 실패).
3. 두 호스트를 순서대로 자동 재시도하도록 확장(`data-api.binance.vision` ↔ `api.binance.com`) → 그럼에도 동일 Android Chrome 세션에서 두 호스트 모두 실패(403, 451) 재현. 두 호스트 모두 서버(Apps Script `UrlFetchApp.fetch()`) 실행 컨텍스트에서 발신되는 요청이라는 공통점이 있으며, 실제로 클릭한 기기(데스크톱/모바일)와 무관하게 항상 Google 클라우드의 공유 서버 IP 풀에서 발신되고, 바이낸스가 이 풀의 일부 대역을 비일관적으로 차단하는 것으로 추정된다.

**결정**: 바이낸스 조회를 서버에서 **클라이언트**(`Index.html`의 브라우저 JavaScript, 네이티브 `fetch()` API)로 완전히 이전한다. 실제 HTTP 요청이 사용자 본인 기기·네트워크의 IP(모바일 데이터 또는 가정용 Wi-Fi)에서 발신되어, Google 클라우드의 공유 IP 풀과 그로 인한 비일관적 차단 문제를 구조적으로 우회한다. 이 결정은 오케스트레이터와의 실시간 대화를 통해 **사용자가 명시적으로 승인**했다 — plan-phase 결정이 아니라 run-phase 실기 테스트 도중 내려진 사후 결정이다.

이 변경은 §3.3(조회 요구사항)과 §3.6.1(REQ-023 위치 근거)의 문언을 v1.1.0 대비 대체한다. 구현이 원래 plan-phase 설계(§3.3 원안: 서버 함수)와 달라진 이유를 이 절에 근거로 남긴다. `Code.gs`의 `fetchBinancePrice`/`tryBinanceHost_`는 이 변경으로 죽은 코드가 되어 삭제됐다.

## 3. 요구사항 (GEARS)

### 3.1 데이터 계층

**REQ-001** (Ubiquitous)
The `AssetTypes` 시트 shall B열에 자산별 바이낸스 심볼을 보관하며, B1 셀은 `바이낸스 심볼` 헤더를 가진다.

**REQ-002** (Ubiquitous)
The 심볼 값 shall 선택 값이며, 비어 있는 심볼은 "바이낸스 조회 대상 아님"을 뜻한다.

**REQ-003** (Ubiquitous)
The `getAssetTypes()` 함수 shall 기존과 동일하게 자산명 문자열 배열(`string[]`)을 반환한다.

**REQ-004** (Ubiquitous)
The `readAssetRows_()` 내부 리더 shall `AssetTypes` 시트의 A·B 두 열을 단일 `getValues()` 호출로 읽어 `{name, symbol}` 객체 배열을 반환한다.

**REQ-005** (Event-driven)
**When** `getPortfolioData()`가 호출되면, the 서버 shall 응답 JSON에 자산명→심볼 매핑 필드를 추가로 포함하되 기존 필드(`rows`, `summary`, `assetTypes`)의 형식은 변경하지 않는다.

**REQ-006** (Event-detected)
**When** `AssetTypes` 시트에 B열 헤더가 없는 상태가 감지되면, the 심볼 프로비저닝 로직 shall B1 헤더 셀을 기록하고 기존 A열 데이터는 보존한다.

### 3.2 심볼 등록·수정

**REQ-007** (Event-driven)
**When** 사용자가 자산 관리 패널에서 특정 자산의 심볼을 저장하면, the `setAssetSymbol(name, symbol)` 서버 함수 shall 해당 자산 행의 B열을 갱신하고 갱신된 포트폴리오 데이터를 반환한다.

**When** 대상 자산명이 `AssetTypes` 시트에 없으면, the `setAssetSymbol` shall `{error}` 형태의 JSON 문자열을 반환하고 시트를 변경하지 않는다.

**REQ-008** (Ubiquitous)
The `addAssetType(name)` 함수 shall 시그니처와 동작을 변경하지 않는다.

### 3.3 조회 (클라이언트 직접 호출) — 2026-08-25 변경, §2.5 참조

> 이 절은 원래 "조회 (서버)"로 v1.1.0까지 서버 함수(`fetchBinancePrice`)를 명시했다. §2.5에 기록된 대로 run-phase 실기 테스트 중 구글 클라우드 IP 지역/접근 차단이 발견되어, 조회 로직 전체가 서버에서 클라이언트로 이전됐다. 아래 REQ-009~013은 그 계층 귀속만 서버→클라이언트로 바꾼 것이며, 각 요구사항의 의도(호출 전 심볼 조회, 방어적 오류 처리, 오류 모드 커버리지, 시트 미접근, 대체값 미사용)는 v1.1.0과 동일하다.

**REQ-009** (Event-driven)
**When** 사용자가 "값 가져오기" 버튼을 클릭하면, the 클라이언트 shall 이미 로드된 `assetSymbolsMap`(서버 `getPortfolioData()` 응답의 `assetSymbols` 필드 — REQ-005로 이미 전달됨)에서 해당 자산의 심볼을 조회한 뒤, 브라우저 네이티브 `fetch()` API로 바이낸스 공개 현물 시세 엔드포인트를 직접 호출한다(`Index.html`의 `fetchBinancePriceClient_(symbol)`).

**REQ-010** (Event-driven)
**When** 바이낸스 응답이 HTTP 200이고 `price` 필드를 포함하면, the 클라이언트 shall `response.json()`으로 파싱한 값을 수치로 변환해 `{price: <number>, symbol: <string>}` 형태의 결과를 만든다.

**REQ-011** (Event-detected)
**When** 심볼 미등록·`fetch()` 프라미스 거부(네트워크·CORS 수준 실패)·비 200 응답(`response.ok`가 false)·JSON 파싱 실패·수치 변환 실패 중 어느 하나라도 감지되면, the 클라이언트 shall 사용자용 오류 메시지를 담은 결과를 만든다.

- `UrlFetchApp`/`muteHttpExceptions`에 대응하는 클라이언트 개념은 없다 — `fetch()`의 프라미스 거부(`.catch()`)가 네트워크·CORS 수준 실패에 해당하며, HTTP 상태 코드 분기는 `response.status`/`response.ok`로 수행한다(400/429/418/451/기타 코드별 분기는 기존 서버 로직과 동일한 메시지로 이식됨).

**REQ-012** (Unwanted)
The 바이낸스 조회 로직(`fetchBinancePriceClient_`) shall not 어떤 경우에도 시트 셀을 읽기 외의 목적으로 접근하거나 값을 기록하지 않는다.

**REQ-013** (Unwanted)
The 바이낸스 조회 로직(`fetchBinancePriceClient_`) shall not 조회 실패 시 이전 값·기본값·대체 시세로 대체하지 않는다.

### 3.4 조회 (클라이언트)

**REQ-014** (Where — capability gate)
**Where** 자산에 비어 있지 않은 바이낸스 심볼이 등록되어 있으면, the 현재가 설정 패널 shall 해당 자산 행에 "값 가져오기" 버튼을 렌더한다.

**REQ-015** (Unwanted)
The 현재가 설정 패널 shall not 심볼이 비어 있는 자산에 "값 가져오기" 버튼을 렌더하지 않는다.

**REQ-016** (Event-driven)
**When** 사용자가 "값 가져오기" 버튼을 클릭하면, the 클라이언트 shall 버튼을 비활성 진행 상태로 바꾸고 `fetchBinancePriceClient_(symbol)`을 호출한다(브라우저 `fetch()` 기반, `google.script.run` 미경유).

**REQ-017** (Event-driven)
**When** `fetchBinancePriceClient_(symbol)` 호출 결과에 `{price}`가 포함되면, the 클라이언트 shall 해당 자산의 현재가 입력 필드(`#pi-<cat>`) 값만 그 가격으로 채우고 버튼을 원래 상태로 되돌린다.

**REQ-018** (Event-detected)
**When** `fetchBinancePriceClient_(symbol)` 호출 결과에 `{error}`가 포함되거나 호출 자체가 실패하면, the 클라이언트 shall 해당 자산 행에 인라인 오류 표시를 노출하고 현재가 입력 필드를 **빈 값**으로 둔다.

**REQ-019** (Unwanted)
The "값 가져오기" 동작 shall not `setAssetPrice`를 호출하지 않으며, 시트 F열을 변경하지 않는다.

**REQ-020** (Unwanted)
The "값 가져오기" 동작 shall not 포트폴리오 테이블·요약 카드의 표시 값을 낙관적으로 갱신하지 않는다.

**REQ-021** (Ubiquitous)
The "적용" 버튼 동작 shall 기존 `applyAssetPrice(cat)` → `setAssetPrice(cat, price)` 흐름을 그대로 유지한다.

### 3.5 문서

**REQ-022** (Ubiquitous)
The 프로젝트 문서(`CLAUDE.md`, `.moai/project/tech.md`) shall 가격 소스 정책을 "수동 입력 기본 + 심볼이 등록된 자산은 바이낸스 현물가 조회 보조"로 갱신한다.

### 3.6 가격 정밀도

**REQ-023** (Event-driven)
**When** `fetchBinancePriceClient_(symbol)`이 바이낸스 응답에서 가격을 성공적으로 파싱하면, the 클라이언트 shall 그 값을 **소수점 둘째 자리로 반올림**한 뒤 반환한다.

- 적용 위치는 **클라이언트**(`Index.html`의 `fetchBinancePriceClient_`)다. 서버가 아니다 — v1.1.0에서는 서버(`Code.gs`의 `fetchBinancePrice`)였으나, 2026-08-25 아키텍처 변경(§2.5)으로 조회 로직 전체가 클라이언트로 이전되며 함께 옮겨졌다 — §3.6.1 참조.
- **반올림(round)** 이며 버림(truncate)이 아니다 — §3.6.2 참조.
- 반환값은 문자열이 아니라 수치여야 한다(`"76258.01"`이 아니라 `76258.01`).

**REQ-024** (Event-detected)
**When** 반올림 결과가 0인데 원본 가격은 0보다 큰 상태가 감지되면, the 서버 shall 그 값을 입력 필드에 채우지 않고 `{error}`를 반환한다.

근거: 1센트 미만 가격의 자산(실측 — `SHIBUSDT` = `0.00000530`)을 둘째 자리로 반올림하면 `0`이 된다. 이 값이 입력 필드에 채워지고 사용자가 "적용"을 누르면 F열이 0이 되어 수익률이 -100%로 계산된다. **조용히 잘못된 값을 만드는 경로이므로 차단한다.** REQ-013(대체값 금지)의 연장선이다.

**REQ-025** (Unwanted)
The 반올림 규칙 shall not 사용자가 손으로 입력하는 현재가에 적용되지 않는다.

두 입력 경로는 같은 입력 필드를 공유하지만 별개다. 사용자가 직접 타이핑한 값은 기존 정밀도(시트 서식 `#,##0.######` 기준 소수점 6자리까지)를 그대로 유지하며, `setAssetPrice` 경로도 변경하지 않는다. 반올림은 **바이낸스에서 가져온 값에만** 적용된다.

#### 3.6.1 왜 클라이언트인가 (2026-08-25 개정 — 원래는 "왜 서버인가")

이 절은 v1.1.0까지 "왜 서버인가"였다. 그때는 반올림 위치를 서버로 결정하는 것이 새로운 판단이었다. 그러나 §2.5에 기록된 아키텍처 변경(구글 클라우드 IP 지역·접근 차단을 회피하기 위해 바이낸스 조회 자체를 서버에서 클라이언트로 이전)에 따라 반올림도 조회와 함께 이동했다 — 이는 "클라이언트가 더 낫다"는 새로운 판단이 아니라, **조회 함수 자체가 클라이언트로 옮겨갔기 때문에 반올림도 같은 함수 안에서 불가피하게 따라간 것**이다.

| 근거 | v1.1.0 (서버) | v1.2.0 (클라이언트, 현재) |
|------|----------------|-----------------------------|
| 계약 단일화 | `fetchBinancePrice`의 반환 계약이 서버 한 곳에만 존재했다 | 이제 `fetchBinancePriceClient_` 한 함수 안에만 존재한다 — 소비자가 늘어도 규칙은 여전히 한 곳뿐이다 |
| 실행 위치가 이동한 이유 | (해당 없음) | 조회 자체가 §2.5의 구글 클라우드 공유 IP 차단을 피하려 클라이언트로 이전했다. 조회에 뒤따르는 반올림을 서버에 남겨 두면 조회-반올림 로직이 두 계층으로 흩어져 계약이 두 곳에 존재하게 된다 |
| 수동 입력 경로 불변 | 수동 입력은 서버 조회 함수를 거치지 않으므로 REQ-025가 구조적으로 보장됐다 | **동일하게 유지된다.** 수동 입력(`applyAssetPrice`)과 조회(`fetchAssetPrice`→`fetchBinancePriceClient_`)는 여전히 완전히 분리된 두 개의 코드 경로다 |

핵심은 마지막 행이다. REQ-025의 보장은 "반올림이 서버에 있다"는 사실에서 나온 것이 아니라 "반올림이 조회 경로에만 있고 수동 입력 경로에는 없다"는 사실에서 나온다. 조회 경로 전체(심볼 조회 → HTTP 호출 → 반올림)가 서버에서 클라이언트로 이동해도, 수동 입력 경로는 애초에 이 조회 경로를 호출한 적이 없으므로 영향을 받지 않는다 — 어느 계층에서 실행되는지와 무관하게 두 경로가 구조적으로 분리되어 있다는 사실 자체가 REQ-025를 보장한다.

#### 3.6.2 왜 반올림인가

버림은 항상 아래쪽으로 편향된다(`76258.019` → `76258.01`). 사람이 눈으로 확인하고 "적용"을 누르는 값이므로, 계통 편향 없이 가장 가까운 값을 쓰는 반올림이 맞다. 최대 차이는 0.01 USD로 어느 쪽이든 미미하지만, 편향이 없는 쪽을 택한다.

**구현 주의 (실측 근거)**: 절반 지점(예: `2.675`) 처리는 JavaScript 부동소수점 특성상 방식에 따라 결과가 갈린다. `Math.round(x*100)/100`과 `Number(x.toFixed(2))`가 **서로 다른 값을 낼 수 있으며, 어느 쪽도 십진 직관을 완전히 보장하지 못한다.** 상세 실측과 권장 구현은 `research.md` §7 참조. 이 SPEC은 결과가 소수점 둘째 자리 이하이고 원본과의 차이가 0.01 미만일 것만 요구하며, 절반 지점의 특정 방향을 규정하지 않는다.

## 4. 제약 조건

| 구분 | 제약 |
|------|------|
| 플랫폼 | 시트/서버 연동(Sheets API 접근 등)은 Google Apps Script `UrlFetchApp` 등 Apps Script API를 사용. 바이낸스 조회는 예외적으로 브라우저 네이티브 `fetch()` API를 사용(2026-08-25 아키텍처 변경, §2.5 — 구글 클라우드 IP 차단 회피). 두 경우 모두 외부 라이브러리 도입 금지 |
| 인증 | 공개 엔드포인트만 사용 — API 키·시크릿 저장 금지 |
| 시트 API | `AssetTypes` 시트 읽기는 호출당 1회(A:B 동시 읽기)를 유지 — 기존 API 호출 최소화 원칙 준수 |
| 통화 | 반환 가격은 USD 기준(USDT 페어). 원화 환산 없음 |
| 정밀도 | 바이낸스 조회 값은 소수점 둘째 자리로 반올림(REQ-023). 수동 입력 정밀도는 불변(REQ-025) |
| 반환 규약 | 신규 서버 함수는 `JSON.stringify({...})` 문자열 반환 규약을 따른다 |
| 하위 호환 | `getAssetTypes` / `addAssetType` / `deleteAssetType` / `setAssetPrice` 시그니처 불변 |
| 배포 | 코드 변경 후 Apps Script 새 버전 재배포 필요 |

## 5. 성공 기준

- 심볼이 등록된 자산에서 "값 가져오기" → 입력 필드에 소수점 둘째 자리까지의 현재 시세가 채워지고 시트는 변하지 않는다.
- 이어서 "적용" → 시트 F열이 그 값으로 갱신된다.
- 심볼이 없는 자산에는 버튼이 보이지 않고 기존 수동 입력 흐름이 그대로 동작한다.
- 잘못된 심볼로 조회 시 오류 표시가 나오고 입력 필드는 비어 있다.
- 기존 자산 추가·삭제·행 CRUD·요약 계산이 회귀 없이 동작한다.

## 6. 제외 범위 (Exclusions)

이 SPEC에서 만들지 **않는** 것들이다. 아래 항목은 out of scope이며, 별도 SPEC 없이 구현에 포함해서는 안 된다.

### Out of Scope — 자동화·주기 실행

- 시간 기반 트리거를 통한 자동 시세 갱신
- 웹앱 로드 시 전 자산 시세 자동 조회
- "전체 자산 한 번에 가져오기" 일괄 조회 버튼

### Out of Scope — 시트 직접 반영

- 조회 결과를 시트 F열에 자동 기록하는 경로 (반영은 "적용" 버튼 전용)
- 시트 셀 수식(`=`)을 통한 시세 조회

### Out of Scope — 가격 소스 확장

- 바이낸스 외 거래소(업비트·코인베이스 등) 연동
- 금·은 현물 시세 소스 연동 (바이낸스에 해당 현물 페어 없음 — research.md 참조)
- USDT/USD 환산, KRW 환산, GOOGLEFINANCE 재도입

### Out of Scope — 캐싱·복원력

- `CacheService` 기반 시세 캐싱
- 재시도(retry)·백오프·레이트리밋 큐잉
- ~~대체 호스트 자동 폴백~~ → **부분 스코프 포함으로 변경 (2026-08-25, §2.5 참조)**: 두 호스트(`data-api.binance.vision`, `api.binance.com`)를 순서대로 한 번씩 시도하는 단순 순차 재시도는, 실기 테스트 중 발견된 실행 컨텍스트별 차단 문제(§2.5) 대응을 위해 사용자 승인으로 스코프에 포함되어 클라이언트 `fetchBinancePriceClient_`에 구현됐다. 캐싱, 지수 백오프, 재시도 지연(`sleep` 등), 레이트리밋 큐잉 같은 진짜 복원력 패턴은 여전히 이 SPEC의 제외 범위다 — 이 순차 시도는 동일 요청 내에서 지연 없이 두 번째 호스트를 시도할 뿐이다.

### Out of Scope — 심볼 관리 고도화

- 바이낸스 `exchangeInfo` 기반 심볼 유효성 사전 검증
- 심볼 자동 추천·자동 매핑
- 자산 추가 모달에서의 심볼 동시 입력 (§2.2에서 기각)

## 7. 참조

- 의존성 그래프: `.moai/project/codemaps/dependencies.md` (§고팬인 함수)
- 모듈 카탈로그: `.moai/project/codemaps/modules.md`
- 바이낸스 응답 형식·오류 모드: `research.md`
- 구현 계획·마일스톤: `plan.md`
- 인수 시나리오: `acceptance.md`
