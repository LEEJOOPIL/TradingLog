---
id: SPEC-PRICE-002
title: "금·은 현물 시세 조회 버튼 (gold-api.com 연동)"
version: "1.0.0"
status: completed
created: "2026-08-25"
updated: "2026-08-26"
author: pilsogood
priority: medium
phase: "v1.3.0 target"
module: price-fetch
lifecycle: spec-anchored
tags: "gold-api, price, assettypes, webapp, external-api, gold, silver"
tier: L
---

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0.0 | 2026-08-25 | 최초 작성 — SPEC-PRICE-001의 클라이언트 직접 조회 아키텍처를 금·은(gold-api.com)으로 확장 | pilsogood |
| 1.0.1 | 2026-08-26 | Tier 재분류(M → L) — plan-auditor FAIL(0.72, Tier M 통과선 0.80 미달, REQ 24건/AC 18건이 Tier M 상한 16/16 초과)에 따른 티어-엔벌로프 정정. 내용 변경 없음 — research.md 신설(§2.1 조사 내용 확장), 프론트매터 `tier: M`→`L` 갱신만 수행. 근거·경위는 `progress.md`의 "Tier 재분류" 절 참조 | pilsogood (오케스트레이터, manager-spec 산출물) |

---

# SPEC-PRICE-002 — 금·은 현물 시세 조회 버튼 (gold-api.com 연동)

## 1. 배경 및 목적

SPEC-PRICE-001은 암호화폐(비트코인·이더리움·솔라나 등)에 한해 "값 가져오기" 버튼으로 바이낸스 현물가를 브라우저에서 직접 조회하는 기능을 완성했다. 그러나 금·은은 여전히 100% 수동 입력이다 — 바이낸스에는 현물 금·은 페어가 없기 때문에(SPEC-PRICE-001 §6 제외 범위, research.md §2.3) 애초에 대상이 아니었다.

이 SPEC은 **금·은 전용**으로 별도의 무료 공개 시세 API(`gold-api.com`)를 연동해, 같은 "현재가 설정 패널"에 있는 동일한 "값 가져오기" 버튼 패턴을 금·은 자산 행에도 적용한다. 주식(국내·해외) 시세 조회는 이 SPEC의 범위가 아니다 — §6 참조.

## 2. 범위 결정 사항 (명시)

### 2.1 조사 결과 — gold-api.com

2026-08-25 계획 단계에서 다음을 실측했다(추정 아님):

```
$ curl https://api.gold-api.com/price/XAU
{"currency":"USD","currencySymbol":"$","exchangeRate":1.0,"name":"Gold","price":4633.600098,"symbol":"XAU","updatedAt":"2026-08-25T13:03:28Z", ...}

$ curl https://api.gold-api.com/price/XAG
{"currency":"USD","currencySymbol":"$","exchangeRate":1.0,"name":"Silver","price":67.912003,"symbol":"XAG","updatedAt":"2026-08-25T13:03:27Z", ...}
```

- 인증키 불필요, 공개 엔드포인트.
- `price`는 바이낸스와 달리 **이미 JSON 숫자**다(문자열이 아님) — 다만 자릿수가 가변적이므로 `Number()`/`isFinite()` 방어는 그대로 필요하다.
- CORS 헤더 실측 확인(`Origin: https://script.google.com`로 요청): `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS` — 브라우저에서 직접 호출해도 막히지 않는다.
- 통화는 항상 USD — 이 프로젝트의 "모든 금액은 USD 기준" 원칙과 그대로 맞는다. 환산 로직이 전혀 필요 없다.
- **미검증 항목**: 잘못된 심볼을 보냈을 때의 응답 형태(상태 코드·본문)는 이번 조사에서 확인하지 못했다. run 단계에서 실제로 확인해 방어 로직을 채워야 한다(§6 미검증 항목 없음 목록과 별개로, 이 항목은 run-phase 실측 대상으로 progress.md에 기록한다).

### 2.2 아키텍처 — 처음부터 클라이언트 직접 호출

SPEC-PRICE-001은 서버(Apps Script `UrlFetchApp`)에서 시작했다가 구글 클라우드 IP 지역 차단 문제로 클라이언트(`fetch()`)로 이전했다(SPEC-PRICE-001 §2.5, §3.6.1). 이 SPEC은 그 교훈을 이미 반영해 **처음부터 클라이언트 직접 호출**로 설계한다 — `gold-api.com` 호출은 서버를 거치지 않으며, `fetchBinancePriceClient_`와 동일한 이유(REQ-012/REQ-013에 대응하는 요구사항, §3.3 이하)로 시트에 어떤 부작용도 남기지 않는다.

### 2.3 데이터 모델 — 신규 열 C ("금속시세 심볼")

`AssetTypes` 시트에 **신규 C열**을 추가한다. 기존 B열("바이낸스 심볼")과 **분리된 별도 열**로 둔다 — 이유:

- 한 자산은 개념적으로 암호화폐이거나 귀금속이거나 둘 중 하나이지, 동시에 둘 다인 경우는 정상 사용에서 발생하지 않는다. 두 값을 하나의 열에 욱여넣으면 "이 문자열이 바이낸스 심볼인지 gold-api 심볼인지"를 형식으로 추측해야 하는데, 이는 조용한 오판단 경로를 만든다(예: `XAU`가 미래에 바이낸스에 상장되면 충돌).
- SPEC-PRICE-001 §2.1~§2.3의 설계(선택 값, 전용 수정 경로, `readAssetRows_()` 단일 읽기)를 그대로 한 열 늘려 재사용하면, 검증된 패턴을 그대로 복제할 수 있고 새로운 개념을 만들 필요가 없다.

심볼은 **선택 값(nullable)**이며, gold-api.com 현물 페어가 없는 자산(비트코인 등)은 비워 둔다. B열과 마찬가지로 **자산 추가 시점이 아니라 자산 관리 패널의 전용 수정 동작**으로 입력한다(SPEC-PRICE-001 §2.2와 동일한 근거).

**기본 금·은 자산도 자동 시드하지 않는다.** SPEC-PRICE-001이 BTC/ETH/SOL 심볼을 신규 시트에 자동 시드했던 것과 달리, 이 SPEC은 금·은 심볼을 자동 시드하지 **않는다** — 사용자가 자산 관리 패널에서 직접 `XAU`/`XAG`를 등록해야 버튼이 나타난다. 이유: 자동 시드는 "새 시트를 만들 때"만 적용되는 1회성 로직인데, 이 프로젝트의 기존 사용자는 이미 시트를 갖고 있고 금·은 행도 이미 존재한다 — 자동 시드 대상이 아니다. 신규 사용자와 기존 사용자 모두에게 동일한 수동 등록 경로를 적용하는 편이 일관적이고, B열 심볼 등록 UX와도 완전히 같은 사용자 경험을 준다.

### 2.4 `getAssetTypes()` 시그니처 — 변경하지 않음

SPEC-PRICE-001 §2.3과 동일한 근거로, `readAssetRows_()`를 A:B에서 **A:C**로 확장하고 반환 객체에 `metalSymbol` 필드를 추가한다. `getAssetTypes()`는 이름만 뽑는 얇은 래퍼로 계속 남으므로 **외부 시그니처는 그대로**다. 금속 심볼은 `getPortfolioData()` 응답에 `metalSymbols` 필드를 **추가**하는 방식으로 전달한다(기존 `rows`/`summary`/`assetTypes`/`assetSymbols` 필드 불변).

### 2.5 UI — 버튼 노출 조건의 OR 확장 + 동시 등록 시 우선순위

현재가 설정 패널의 "값 가져오기" 버튼은 지금까지 "바이낸스 심볼이 있는가"만 확인했다. 이 SPEC은 조건을 **OR**로 확장한다 — 바이낸스 심볼 **또는** 금속시세 심볼 중 하나라도 있으면 버튼을 렌더한다. 버튼 클릭 시 어떤 심볼이 채워져 있는지에 따라 `fetchBinancePriceClient_` 또는 신규 `fetchGoldApiPriceClient_` 중 하나를 호출한다.

**동시 등록 시 우선순위(정상 사용에서는 발생하지 않아야 하지만, 명시적으로 정의)**: 한 자산에 바이낸스 심볼과 금속시세 심볼이 **둘 다** 등록된 경우, 클라이언트는 **바이낸스 심볼을 우선**한다 — 두 조회를 동시에 하거나 결과를 합치지 않는다(REQ-015). 근거: 바이낸스 경로가 먼저 구현·검증된 기존 경로이므로 우선순위를 그 쪽에 두는 편이 회귀 위험이 가장 낮다. 이 상황 자체가 정상 자산 설계라면 나타나지 않아야 하므로, 사용자가 실수로 두 심볼을 다 채운 경우를 위한 결정론적 규칙일 뿐이다.

자산 관리 패널에는 금속시세 심볼을 위한 **별도 입력 필드**를 하나 더 둔다(기존 "바이낸스 심볼" 입력 필드 옆). 인라인 입력 + 저장 버튼 UX는 SPEC-PRICE-001 M3에서 확정된 패턴을 그대로 따른다.

## 3. 요구사항 (GEARS)

### 3.1 데이터 계층

**REQ-001** (Ubiquitous)
The `AssetTypes` 시트 shall C열에 자산별 gold-api.com 심볼을 보관하며, C1 셀은 `금속시세 심볼` 헤더를 가진다.

**REQ-002** (Ubiquitous)
The 금속시세 심볼 값 shall 선택 값이며, 비어 있는 심볼은 "gold-api.com 조회 대상 아님"을 뜻한다.

**REQ-003** (Event-detected)
**When** `AssetTypes` 시트에 C열 헤더가 없는 상태가 감지되면, the 심볼 프로비저닝 로직 shall C1 헤더 셀을 기록하고 기존 A·B열 데이터는 보존한다.

**REQ-004** (Ubiquitous)
The `readAssetRows_()` 내부 리더 shall `AssetTypes` 시트의 A·B·C 세 열을 단일 `getValues()` 호출로 읽어 `{name, symbol, metalSymbol}` 객체 배열을 반환한다.

**REQ-005** (Event-driven)
**When** `getPortfolioData()`가 호출되면, the 서버 shall 응답 JSON에 자산명→금속시세 심볼 매핑 필드(`metalSymbols`)를 추가로 포함하되 기존 필드(`rows`, `summary`, `assetTypes`, `assetSymbols`)의 형식은 변경하지 않는다.

### 3.2 심볼 등록·수정

**REQ-006** (Event-driven)
**When** 사용자가 자산 관리 패널에서 특정 자산의 금속시세 심볼을 저장하면, the `setMetalSymbol(name, symbol)` 서버 함수 shall 해당 자산 행의 C열을 갱신하고 갱신된 포트폴리오 데이터를 반환한다.

**When** 대상 자산명이 `AssetTypes` 시트에 없으면, the `setMetalSymbol` shall `{error}` 형태의 JSON 문자열을 반환하고 시트를 변경하지 않는다.

**REQ-007** (Ubiquitous)
The `getAssetTypes()` / `addAssetType(name)` / `deleteAssetType(name, force)` / `setAssetPrice(cat, price)` / `setAssetSymbol(name, symbol)` 함수 shall 시그니처와 동작을 변경하지 않는다.

### 3.3 조회 (클라이언트 직접 호출)

**REQ-008** (Event-driven)
**When** 사용자가 금속시세 심볼만 등록된(바이낸스 심볼은 비어 있는) 자산 행에서 "값 가져오기" 버튼을 클릭하면, the 클라이언트 shall 이미 로드된 `metalSymbolsMap`(서버 `getPortfolioData()` 응답의 `metalSymbols` 필드 — REQ-005로 전달됨)에서 해당 자산의 심볼을 조회한 뒤, 브라우저 네이티브 `fetch()` API로 `https://api.gold-api.com/price/<심볼>`을 직접 호출한다(`Index.html`의 `fetchGoldApiPriceClient_(symbol)`, `google.script.run` 미경유).

**REQ-009** (Event-driven)
**When** gold-api.com 응답이 HTTP 200이고 `price` 필드(JSON 숫자)를 포함하면, the 클라이언트 shall 그 값을 수치로 검증해 `{price: <number>, symbol: <string>}` 형태의 결과를 만든다.

**REQ-010** (Event-detected)
**When** 심볼 미등록·`fetch()` 프라미스 거부(네트워크·CORS 수준 실패)·비 200 응답(`response.ok`가 false)·JSON 파싱 실패·수치 변환 실패(`isFinite` 거짓) 중 어느 하나라도 감지되면, the 클라이언트 shall 사용자용 오류 메시지를 담은 결과를 만든다. 잘못된 심볼에 대한 실제 응답 형태는 §2.1의 미검증 항목이므로, run-phase에서 실측 후 구체적인 상태 코드 분기를 확정한다 — 확정 전까지는 200이 아닌 모든 응답을 방어적으로 오류 처리한다.

**REQ-011** (Unwanted)
The gold-api.com 조회 로직(`fetchGoldApiPriceClient_`) shall not 어떤 경우에도 `google.script.run`을 호출하거나 시트 셀에 값을 기록하지 않는다.

**REQ-012** (Unwanted)
The gold-api.com 조회 로직(`fetchGoldApiPriceClient_`) shall not 조회 실패 시 이전 값·기본값·대체 시세로 대체하지 않는다.

### 3.4 조회 (UI)

**REQ-013** (Where — capability gate)
**Where** 자산에 바이낸스 심볼과 금속시세 심볼이 **둘 다** 비어 있으면, the 현재가 설정 패널 shall 해당 자산 행에 "값 가져오기" 버튼을 렌더하지 않는다(기존 SPEC-PRICE-001 REQ-015의 OR 확장 — 둘 중 하나라도 있으면 렌더).

**REQ-014** (Where)
**Where** 자산에 금속시세 심볼만 등록되어 있으면(바이낸스 심볼은 비어 있으면), the "값 가져오기" 버튼 클릭 shall `fetchGoldApiPriceClient_`를 호출한다.

**REQ-015** (Where — 우선순위)
**Where** 자산에 바이낸스 심볼과 금속시세 심볼이 **둘 다** 등록되어 있으면, the "값 가져오기" 버튼 클릭 shall 바이낸스 심볼을 우선해 `fetchBinancePriceClient_`만 호출하고 `fetchGoldApiPriceClient_`는 호출하지 않는다 — 두 결과를 합치거나 순차 호출하지 않는다.

**REQ-016** (Event-driven)
**When** `fetchGoldApiPriceClient_(symbol)` 호출 결과에 `{price}`가 포함되면, the 클라이언트 shall 해당 자산의 현재가 입력 필드(`#pi-<cat>`) 값만 그 가격으로 채우고 버튼을 원래 상태로 되돌린다.

**REQ-017** (Event-detected)
**When** `fetchGoldApiPriceClient_(symbol)` 호출 결과에 `{error}`가 포함되거나 호출 자체가 실패하면, the 클라이언트 shall 해당 자산 행에 인라인 오류 표시를 노출하고 현재가 입력 필드를 **빈 값**으로 둔다.

**REQ-018** (Unwanted)
The 금속시세 "값 가져오기" 동작 shall not `setAssetPrice`를 호출하지 않으며, 시트 F열을 변경하지 않는다.

**REQ-019** (Unwanted)
The 금속시세 "값 가져오기" 동작 shall not 포트폴리오 테이블·요약 카드의 표시 값을 낙관적으로 갱신하지 않는다.

**REQ-020** (Ubiquitous)
The "적용" 버튼 동작 shall 기존 `applyAssetPrice(cat)` → `setAssetPrice(cat, price)` 흐름을 그대로 유지하며, 금속시세로 채워진 값에도 동일하게 적용된다.

### 3.5 가격 정밀도

**REQ-021** (Event-driven)
**When** `fetchGoldApiPriceClient_(symbol)`이 gold-api.com 응답에서 가격을 성공적으로 파싱하면, the 클라이언트 shall 그 값을 **소수점 둘째 자리로 반올림**한 뒤 반환한다(SPEC-PRICE-001 REQ-023과 동일한 규칙).

**REQ-022** (Event-detected)
**When** 반올림 결과가 0인데 원본 가격은 0보다 큰 상태가 감지되면, the 클라이언트 shall 그 값을 입력 필드에 채우지 않고 `{error}`를 반환한다(SPEC-PRICE-001 REQ-024와 동일한 방어 — 금·은 시세의 통상적인 자릿수 범위에서는 발생 가능성이 낮지만, 아키텍처 일관성과 미래의 극단적 시세 변동에 대비해 동일하게 적용한다).

**REQ-023** (Unwanted)
The 반올림 규칙 shall not 사용자가 손으로 입력하는 현재가에 적용되지 않는다 — 수동 입력 경로는 `fetchGoldApiPriceClient_`를 호출하지 않으므로 구조적으로 보장된다(SPEC-PRICE-001 REQ-025와 동일한 근거).

### 3.6 문서

**REQ-024** (Ubiquitous)
The 프로젝트 문서(`CLAUDE.md`, `.moai/project/tech.md`) shall 가격 소스 정책을 "금·은은 gold-api.com 조회를 보조로 사용할 수 있다"는 내용을 포함하도록 갱신한다(sync-phase, manager-docs 소유).

## 4. 제약 조건

| 구분 | 제약 |
|------|------|
| 플랫폼 | 시트/서버 연동은 Google Apps Script API 사용. gold-api.com 조회는 SPEC-PRICE-001과 동일하게 브라우저 네이티브 `fetch()` API를 사용(서버 미경유). 외부 라이브러리 도입 금지 |
| 인증 | 공개 엔드포인트만 사용 — API 키·시크릿 저장 금지 |
| 시트 API | `AssetTypes` 시트 읽기는 호출당 1회(A:C 동시 읽기)를 유지 |
| 통화 | 반환 가격은 USD 기준(gold-api.com 네이티브 USD). 원화 환산 없음 — 이 항목은 애초에 발생하지 않는다 |
| 정밀도 | gold-api.com 조회 값은 소수점 둘째 자리로 반올림(REQ-021). 수동 입력 정밀도는 불변(REQ-023) |
| 반환 규약 | 신규 서버 함수(`setMetalSymbol`)는 `JSON.stringify({...})` 문자열 반환 규약을 따른다 |
| 하위 호환 | `getAssetTypes` / `addAssetType` / `deleteAssetType` / `setAssetPrice` / `setAssetSymbol` 시그니처 불변 |
| 배포 | 코드 변경 후 Apps Script 새 버전 재배포 필요 |

## 5. 성공 기준

- 금·은에 gold-api.com 심볼(`XAU`/`XAG`)이 등록되면 "값 가져오기" → 입력 필드에 소수점 둘째 자리까지의 현재 시세가 채워지고 시트는 변하지 않는다.
- 이어서 "적용" → 시트 F열이 그 값으로 갱신된다.
- 두 심볼이 모두 없는 자산에는 버튼이 보이지 않고 기존 수동 입력 흐름이 그대로 동작한다.
- 바이낸스 심볼이 등록된 기존 자산(비트코인 등)의 조회 흐름은 회귀 없이 그대로 동작한다(REQ-015 우선순위 규칙 포함).
- 잘못된 심볼로 조회 시 오류 표시가 나오고 입력 필드는 비어 있다.
- 기존 자산 추가·삭제·행 CRUD·요약 계산이 회귀 없이 동작한다.

## 6. 제외 범위 (Exclusions)

이 SPEC에서 만들지 **않는** 것들이다. 아래 항목은 out of scope이며, 별도 SPEC 없이 구현에 포함해서는 안 된다.

### 6.1 Out of Scope

- **주식(국내·해외) 시세 조회 — 별도 SPEC으로 연기.** 이번 계획 단계 조사에서 브라우저가 안전하게 직접 호출할 수 있는(CORS 허용) 무료·키 불필요 소스를 찾지 못했다: 네이버 증권 실시간 API는 교차 출처 요청이 403으로 차단됐고, 야후 파이낸스는 응답은 오지만 CORS 허용 헤더가 없어 실제 브라우저에서는 차단될 가능성이 크다. 국내 주식(코스피·코스닥)은 추가로 원화→달러 환산 문제가 있다(이 프로젝트는 "모든 금액은 USD" 원칙). 사용자는 향후 국내·해외 주식을 **모두** 지원하길 원한다고 밝혔다 — 이 선호는 향후 별도 SPEC을 위한 참고 사항으로 기록해 둔다.
- gold-api.com 외 다른 귀금속 시세 제공자 연동(대체 호스트 자동 폴백 포함)
- 금·은 외 다른 귀금속(백금·팔라듐 등) 지원
- 시간 기반 트리거를 통한 자동 시세 갱신
- 웹앱 로드 시 전 자산 시세 자동 조회
- "전체 자산 한 번에 가져오기" 일괄 조회 버튼
- 조회 결과를 시트 F열에 자동 기록하는 경로 (반영은 "적용" 버튼 전용)
- 시트 셀 수식(`=`)을 통한 시세 조회
- `CacheService` 기반 시세 캐싱, 재시도·백오프·레이트리밋 큐잉

## 7. 참조

- 선행 SPEC(아키텍처·패턴 출처): `.moai/specs/SPEC-PRICE-001/spec.md`, `plan.md`
- gold-api.com 실측 근거: 이 문서 §2.1(요약) 및 `research.md`(확장본, Tier L 재분류에 따라 신설)
- 구현 계획·마일스톤: `plan.md`
- 인수 시나리오: `acceptance.md`
