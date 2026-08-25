# SPEC-PRICE-002 — 사전 조사

Tier 재분류(M → L, 2026-08-26)에 따라 신설된 확장 조사 문서다. 이 SPEC 최초 작성(2026-08-25) 시점에는 조사 내용이 spec.md §2.1에 인라인으로만 기록되어 있었다. 이 문서는 그 내용을 확장하며, spec.md §2.1의 요약은 삭제하지 않고 그대로 유지한다 — 이 문서는 **확장 동반 문서**다.

아키텍처 범위(클라이언트 직접 호출)는 SPEC-PRICE-001에서 이미 확정되어 재사용하므로, 이 문서는 **gold-api.com API 응답 형식과 오류 모드**, 그리고 기존 코드(SPEC-PRICE-001 산출물) 재사용 지점에 집중한다.

## 1. 엔드포인트

```
GET https://api.gold-api.com/price/<SYMBOL>
```

- 인증 불필요(공개 엔드포인트). API 키·시크릿 없음.
- 심볼은 경로 파라미터다(바이낸스처럼 쿼리 파라미터가 아니다) — 클라이언트 구현 시 `encodeURIComponent(symbol)`로 경로에 삽입해야 한다.
- 요청 가중치·레이트리밋 정책은 공개 문서에 명시되어 있지 않다 — 이번 조사에서 확인하지 못했다(§6 미검증 항목).

## 2. 실측 응답 (2026-08-25 계획 단계 확인)

아래는 실제 엔드포인트를 호출해 관찰한 출력이다(추정 아님). spec.md §2.1과 동일한 실측 데이터를 이 문서에서 더 자세히 다룬다.

### 2.1 성공 — 금(XAU)

```
$ curl https://api.gold-api.com/price/XAU
{"currency":"USD","currencySymbol":"$","exchangeRate":1.0,"name":"Gold","price":4633.600098,"symbol":"XAU","updatedAt":"2026-08-25T13:03:28Z", ...}
```

### 2.2 성공 — 은(XAG)

```
$ curl https://api.gold-api.com/price/XAG
{"currency":"USD","currencySymbol":"$","exchangeRate":1.0,"name":"Silver","price":67.912003,"symbol":"XAG","updatedAt":"2026-08-25T13:03:27Z", ...}
```

**핵심**: `price`는 바이낸스(SPEC-PRICE-001 research.md §2.1 — 문자열 `"76258.01000000"`)와 달리 **이미 JSON 숫자**다. `parseFloat()` 문자열→숫자 변환 단계가 필요 없다. 다만 응답 형태가 예상과 다를 가능성(필드 누락, 타입 불일치)에 대비해 `Number(raw)` 감싸기 + `isFinite()` 방어는 그대로 필요하다 — REQ-009 근거.

### 2.3 CORS 헤더 실측 확인

```
$ curl -I -H "Origin: https://script.google.com" https://api.gold-api.com/price/XAU
...
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
...
```

`Access-Control-Allow-Origin: *`가 실측 확인됐다 — 브라우저에서 `Index.html`의 클라이언트 `fetch()`로 직접 호출해도 CORS 수준에서 막히지 않는다. 이는 SPEC-PRICE-001이 **아키텍처를 변경하면서** 뒤늦게 배운 교훈(research.md §8.3 — "대상 API가 브라우저의 크로스오리진 요청에 CORS를 허용하는지가 전제 조건이며, 이는 설계 시점에 반드시 확인해야 한다")을 이 SPEC이 계획 단계에서 먼저 반영한 결과다.

### 2.4 통화

응답의 `currency` 필드는 항상 `"USD"`다. 이 프로젝트의 "모든 금액은 USD 기준" 원칙과 그대로 맞아떨어지므로 환산 로직이 전혀 필요 없다(REQ-021 이하 정밀도 요구사항 외에 추가 변환 단계 없음).

## 3. 오류 모드 목록 (구현이 반드시 다뤄야 하는 것)

바이낸스(research.md §3, SPEC-PRICE-001)와 달리 gold-api.com은 오류 응답 문서가 공개되어 있지 않다. 아래는 **방어적으로 설계해야 하는** 오류 모드이며, 실측되지 않은 항목은 명시적으로 표시한다.

| # | 오류 모드 | 감지 방법 | 실측 여부 |
|---|-----------|-----------|-----------|
| E1 | 심볼 미등록(빈 값) | 클라이언트에서 `metalSymbolsMap[cat]`이 빈 문자열 | 해당 없음(클라이언트 로직으로 사전 차단) |
| E2 | 잘못된 심볼(예: `ZZZ`) | 비 200 응답 또는 200이지만 `price` 필드 없음 — **정확한 상태 코드·본문 형태는 미검증** | **미검증** — run-phase M2에서 실측 필요 |
| E3 | 네트워크/CORS 수준 실패 | `fetch()` 프라미스 거부 | 미검증(재현 안 됨) |
| E4 | JSON 파싱 실패 | `response.json()` 예외 | 미검증(재현 안 됨) |
| E5 | 수치 변환 실패 | `isFinite(Number(raw))` 거짓 | 미검증(재현 안 됨) — 방어 코드는 REQ-009로 요구됨 |
| E6 | 레이트리밋 | 비 200 응답(구체적 코드 미상) | 미검증 |

**가장 중요한 미검증 항목은 E2다.** spec.md §2.1과 plan.md §B 이슈 1에 이미 기록되어 있듯, 잘못된 심볼에 대한 gold-api.com의 실제 응답(상태 코드·본문)은 이번 계획 단계 조사에서 확인하지 못했다. REQ-010은 이 gap을 명시적으로 인지하고, 확정 전까지 "200이 아닌 모든 응답을 방어적으로 오류 처리"하도록 요구한다. plan.md M2 마일스톤은 착수 직후 최소 1회 실측(curl 또는 브라우저 콘솔)으로 이 gap을 해소하도록 지시한다.

## 4. 클라이언트 호출 시 주의점 (SPEC-PRICE-001 패턴 재사용)

```javascript
fetch(`https://api.gold-api.com/price/${encodeURIComponent(symbol)}`)
  .then(res => {
    if (!res.ok) throw new Error('gold-api non-200: ' + res.status);
    return res.json();
  })
  .then(json => {
    const raw = Number(json.price);
    if (!isFinite(raw)) throw new Error('gold-api invalid price');
    const rounded = Number(raw.toFixed(2));
    if (rounded === 0 && raw > 0) throw new Error('gold-api rounds to zero');
    return { price: rounded, symbol };
  })
  .catch(err => ({ error: err.message }));
```

- SPEC-PRICE-001의 `fetchBinancePriceClient_`와 **동일한 오류 처리 골격**(비 200 → throw, JSON 파싱 실패 → catch, 수치 변환 실패 → 방어, 0 붕괴 가드)을 재사용한다. 유일한 구조적 차이는 `price`가 이미 숫자이므로 `parseFloat()` 문자열 변환 단계가 없다는 점이다(§2.1).
- `UrlFetchApp`/Apps Script 서버 관련 주의사항(SPEC-PRICE-001 research.md §4의 `muteHttpExceptions`, 일일 쿼터, `script.external_request` OAuth 스코프)은 **이 SPEC에 해당 없음** — 조회가 처음부터 클라이언트 직접 호출이므로 서버 측 HTTP 클라이언트 코드가 없다(spec.md §2.2). 이 SPEC은 SPEC-PRICE-001이 사후에(§2.5 아키텍처 변경) 도달한 결론을 처음부터 채택한다.
- 브라우저 `fetch()`의 네트워크·CORS 수준 실패는 `.catch()`로, HTTP 상태 코드 분기는 `response.ok`/`response.status`로 수행한다 — SPEC-PRICE-001 REQ-011과 동일한 패턴(REQ-010).

## 5. 기존 코드에서 확인한 사실 (재사용 지점)

| 항목 | 확인 내용 | 위치 |
|------|-----------|------|
| `readAssetRows_()` | 현재 A:B 2열을 `getValues()` 1회로 읽어 `{name, symbol}` 배열 반환(SPEC-PRICE-001 산출물) | `Code.gs` |
| `getAssetTypes()` | `readAssetRows_()` 결과에서 이름만 뽑는 얇은 래퍼, `string[]` 반환. `@MX:ANCHOR fan_in=4`(SPEC-PRICE-001 research.md §5 인용) | `Code.gs` |
| `getPortfolioData()` | 응답에 `assetSymbols` 필드를 이미 포함(SPEC-PRICE-001 REQ-005 산출물) — 이 SPEC은 여기에 `metalSymbols` 필드를 병렬로 추가만 한다 | `Code.gs` |
| `renderAssetManager()` | 자산별 바이낸스 심볼 인라인 입력 필드(`sym-<name>`) + 저장 버튼 UX가 이미 확정된 패턴(SPEC-PRICE-001 M3) | `Index.html` |
| `fetchBinancePriceClient_` | 브라우저 `fetch()` 직접 호출, `google.script.run` 미경유, 오류 처리 골격이 이미 검증됨(SPEC-PRICE-001 §2.5, §3.6.1) | `Index.html` |
| `ensureAssetSymbolHeader_()` | B열 헤더를 멱등하게 프로비저닝하는 기존 로직 — C열에도 동일한 패턴을 적용할 근거(plan.md M1) | `Utils.gs` |

**재사용 가능성이 이 SPEC 전체의 낮은-위험 근거다.** 새로 설계해야 하는 것은 (a) C열 데이터 모델, (b) `setMetalSymbol` 신규 함수, (c) `fetchGoldApiPriceClient_` 신규 함수, (d) 버튼 노출 조건의 OR 확장 + 우선순위 분기뿐이다 — 나머지는 SPEC-PRICE-001에서 이미 검증된 패턴을 그대로 재사용한다(plan.md §C).

## 6. 미검증 항목 (Gaps)

- **잘못된 심볼(E2)에 대한 gold-api.com의 정확한 응답 형태** — 상태 코드·본문이 모두 미확인. run-phase M2 착수 직후 실측 필요(plan.md §B 이슈 1, §I 열린 항목).
- 레이트리밋·서버 오류(E6) 응답 형태 — 재현되지 않음, 문서화되지 않음.
- gold-api.com의 응답 지연(latency) 특성 — 이번 조사에서 측정하지 않았다. 사용자가 버튼을 누를 때만 호출하므로 지연이 크더라도 UX상 치명적이지는 않을 것으로 예상되나, 실측하지 않았다.
- 실제 배포된 Google Apps Script 웹앱(브라우저 `fetch()`) 환경에서의 CORS 재확인 — 로컬 `curl` 성공(§2.3)이 실제 배포 환경의 성공을 보증하지 않는다는 점은 SPEC-PRICE-001 research.md §3 E5 경고 및 §8의 실측 교훈과 동일하게 적용된다(plan.md §B 이슈 5).

## 7. 가격 정밀도 — SPEC-PRICE-001 결정 재사용

SPEC-PRICE-001 research.md §7에서 이미 실측·확정된 반올림 구현(`Number(x.toFixed(2))`, 절반 지점 처리의 통념 반증, 0 붕괴 위험)을 이 SPEC은 **그대로 재사용**한다 — 새로운 실측이 필요하지 않다. 유일한 차이는 gold-api.com의 `price`가 이미 숫자이므로 `parseFloat()` 문자열 변환 단계가 생략된다는 점뿐이다(§2.1, §4).

0 붕괴 위험(SPEC-PRICE-001 research.md §7.4 — `SHIBUSDT`/`PEPEUSDT` 사례)은 금·은 시세의 통상적인 자릿수 범위(수십~수천 USD)에서는 발생 가능성이 낮지만, 아키텍처 일관성과 미래의 극단적 시세 변동에 대비해 동일한 가드(REQ-022)를 적용한다 — acceptance.md AC-017 참조.

## 8. 참조

- 아키텍처·패턴 출처: `.moai/specs/SPEC-PRICE-001/spec.md`, `research.md`, `plan.md`
- 이 문서의 조사 요약: `spec.md` §2.1
- 구현 계획: `plan.md`
- 인수 시나리오: `acceptance.md`
