# SPEC-PRICE-001 — 구현 계획

> 마일스톤은 **되돌리기 어려운 결정 순서**로 배열했다. 앞쪽일수록 바뀔 가능성이 크고 리뷰 가치가 높다. 뒤쪽은 기계적 작업이다.

## §A 컨텍스트

| 항목 | 값 |
|------|-----|
| 대상 파일 | `Code.gs`, `Utils.gs`, `Menu.gs`, `Index.html` |
| 신규 서버 함수 | `fetchBinancePrice(cat)`, `setAssetSymbol(name, symbol)`, `readAssetRows_()`, `ensureAssetSymbolHeader_()` |
| 시그니처 변경 | **없음** (§C 참조) |
| 신규 시트 열 | `AssetTypes` B열 — `바이낸스 심볼` |
| 외부 의존 | 바이낸스 공개 REST (`api.binance.com`) — 프로젝트 최초의 외부 API |
| 개발 방식 | 자동화 테스트 스위트 없음 → Apps Script 에디터 수동 실행 + 웹앱 실기 확인 (acceptance.md 기준) |

## §B 알려진 이슈 / 사전 확인 사항

1. **`initAssetTypesSheet_()`는 기존 시트에서 조기 반환한다** (`getLastRow() >= 2` → `return`). 이 함수만 고쳐서는 기존 사용자 시트에 B열 헤더가 생기지 않는다. 멱등 헤더 프로비저닝 경로가 별도로 필요하다.
2. **`price`는 문자열로 온다** (`"76258.01000000"`). 숫자 변환과 `NaN` 방어가 필수다.
3. **`UrlFetchApp`에는 `muteHttpExceptions: true`가 필수다.** 없으면 400/429/451이 예외로 던져져 오류 분기가 무너진다.
4. **OAuth 스코프 추가 필요** — `script.external_request`. 최초 실행 시 재승인 프롬프트가 뜬다. 배포 안내에 포함해야 한다.
5. **로컬 `curl` 성공은 Apps Script 성공의 보증이 아니다.** 요청은 Google 서버에서 나가므로 지역 차단(451) 가능성이 남아 있다. M1 착수 직후 최소 호출로 먼저 확인한다.

## §C 핵심 설계 결정 — fan-in 파급 회피

`getAssetTypes()`는 `@MX:ANCHOR fan_in=4`다. 반환 형식을 바꾸면 아래가 전부 흔들린다.

| 계층 | 영향받는 호출부 |
|------|------------------|
| 서버 | `addAssetType`, `deleteAssetType`, `getPortfolioData`, `updateAssetDropdown_` |
| 클라이언트 | `assetTypesList` 대입(`onData`), `renderPricePanel`, `renderAssetManager`, `populateCatSelect` |

**채택안 — 래퍼 분리 (파급 0)**

```
readAssetRows_()            [신규] A:B 단일 getValues() → [{name, symbol}]
   ├── getAssetTypes()      [수정] 내부 구현만 교체, 반환은 그대로 string[]
   └── fetchBinancePrice()  [신규] 심볼 조회에 사용
```

- `getAssetTypes()`의 **외부 시그니처가 불변**이므로 서버 4개 호출부는 손대지 않는다.
- `getPortfolioData()`는 `readAssetRows_()`를 **1회만** 호출해 `assetTypes`(이름 배열)와 `assetSymbols`(맵)를 **인라인으로** 함께 만든다 — 별도의 `getAssetSymbolMap_()` 헬퍼는 두지 않는다. `readAssetRows_()`가 반환하는 `[{name, symbol}]` 배열을 `getPortfolioData()` 내부에서 바로 순회해 `{name: symbol}` 맵을 조립하는 것으로 충분하며, 이 조립 로직만을 위한 별도 이름의 함수를 만들 근거가 없다(§F M2 참조 — M2 작업 목록도 `getAssetSymbolMap_()`을 별도로 언급하지 않는다). → 시트 읽기 횟수 증가 없음.
- 클라이언트 `assetTypesList`는 계속 `string[]`이므로 `renderAssetManager` / `populateCatSelect` / `updateAssetDropdown_`은 **변경 없음**.
- 변경이 필요한 클라이언트 함수는 `renderPricePanel`(버튼 조건부 렌더)과 `onData`(신규 필드 수신) 둘뿐이다.

**기각안 — `getAssetTypes()` 반환 형식 변경**: 위 표의 8개 지점을 동시에 수정해야 하고, 그 중 `updateAssetDropdown_`은 `requireValueInList(list)`에 문자열 배열을 그대로 넘기므로 매핑 누락 시 드롭다운이 조용히 깨진다. 이득 대비 위험이 크다.

## §D 제약

- 신규·수정 서버 함수는 `JSON.stringify({...})` 반환 규약을 따른다.
- `AssetTypes` 시트 읽기는 호출당 1회를 유지한다(A:B 동시 읽기).
- 외부 라이브러리 도입 금지. `UrlFetchApp`만 사용.
- API 키·시크릿을 코드나 시트에 저장하지 않는다.
- 기존 낙관적 렌더링 동작을 "적용" 경로에서 그대로 유지한다.

## §E 자기 검증

자동화 테스트가 없으므로, 각 마일스톤 종료 시 다음을 실행하고 관찰 결과를 `progress.md` §E.2에 기록한다.

| 검증 | 방법 |
|------|------|
| 서버 함수 단독 동작 | Apps Script 에디터에서 함수 직접 실행 + 로그 확인 |
| 회귀 | 자산 추가/삭제, 행 추가/수정/삭제, 요약 카드 값 확인 |
| 시트 불변성 | "값 가져오기" 전후 F열 값 비교 |
| 오류 경로 | 존재하지 않는 심볼(`NOSUCHPAIR`)을 임시 등록해 조회 |

## §F 마일스톤

### M1 — 데이터 모델 및 시트 스키마 (되돌리기 가장 어려움)

사용자 스프레드시트의 구조를 바꾸는 단계다. 한 번 배포되면 기존 데이터가 얹히므로 가장 신중해야 한다.

- `Utils.gs`: `ensureAssetSymbolHeader_()` 신규 — B1이 비었을 때만 `바이낸스 심볼` 기록(멱등).
- `Utils.gs`: `initAssetTypesSheet_()` 수정 — 신규 시트 생성 시 B1 헤더 + 기본 심볼 시드(`비트코인→BTCUSDT`, `이더리움→ETHUSDT`, `솔라나→SOLUSDT`, 나머지 공란). 기존 시트 조기 반환 동작은 **보존**하되 반환 직전 `ensureAssetSymbolHeader_()`를 통과시킨다.
- `Menu.gs`: `initSheet()`에서 헤더 프로비저닝 경로가 실행되도록 연결.
- 대응 요구사항: REQ-001, REQ-002, REQ-006

**결정 완료 (2026-08-23, 사용자)**: 기본 심볼 **자동 시드한다.** 신규 시트에 한해 `BTCUSDT`/`ETHUSDT`/`SOLUSDT`를 삽입하고 `금`/`은`/`USDT`/`USDC`는 공란. 기존 시트는 조기 반환 동작을 보존하므로 시드 대상이 아니다(헤더만 멱등 보강).

### M2 — 서버 읽기 계층 재구성 (fan-in 파급 지점)

`@MX:ANCHOR` 함수의 내부를 바꾸는 단계다. 시그니처는 유지하지만 회귀 위험이 실재한다.

- `Code.gs`: `readAssetRows_()` 신규 (A:B 단일 읽기).
- `Code.gs`: `getAssetTypes()` 내부를 `readAssetRows_()` 기반으로 교체 — **반환 형식 불변**. `@MX:ANCHOR` 주석에 시그니처 보존 사실을 명시.
- `Code.gs`: `getPortfolioData()`에 `assetSymbols` 필드 추가(기존 필드 불변, 시트 읽기 횟수 불변).
- 대응 요구사항: REQ-003, REQ-004, REQ-005, REQ-008

**회귀 확인 필수**: 자산 추가/삭제 후 B열 드롭다운이 정상 갱신되는지 반드시 눈으로 확인한다(`updateAssetDropdown_` 경유).

### M3 — 심볼 등록·수정 경로 (사용자 노출 UX 결정)

- `Code.gs`: `setAssetSymbol(name, symbol)` 신규 — 자산명 매칭 → B열 기록 → `getPortfolioData()` 반환. 미존재 자산은 `{error}`.
- `Index.html`: 자산 관리 패널의 자산 태그에 심볼 표시 + 심볼 편집 동작 추가.
- 대응 요구사항: REQ-007

**결정 완료 (2026-08-23, 사용자)**: 심볼 편집 UI는 **인라인 입력 필드**로 확정한다(`prompt()` 방식 기각). `renderAssetManager()`가 렌더하는 자산 태그 옆에 인라인 입력 필드를 두고 그 자리에서 값을 편집한다. 서버 계약(`setAssetSymbol(name, symbol)`)은 이 결정과 무관하게 변경 없음 — 이 결정은 클라이언트 UI 형태에만 영향을 준다.

### M4 — 바이낸스 조회 서버 함수

- `Code.gs`: `fetchBinancePrice(cat)` 신규.
  - 심볼 조회 → 공란이면 즉시 `{error}` (E1)
  - `UrlFetchApp.fetch(url, {muteHttpExceptions: true})`
  - 상태 코드 분기 (200 / 400 / 429 / 418 / 451 / 기타)
  - `JSON.parse` + `parseFloat` + 유한값 검사
  - **소수점 둘째 자리 반올림** — `Number(parseFloat(raw).toFixed(2))`
  - **0 붕괴 가드** — 반올림 결과가 0인데 원본이 0보다 크면 `{error}` 반환
  - 성공 `{price, symbol}` / 실패 `{error}`
- `appsscript.json`: `script.external_request` 스코프 추가 확인.
- 대응 요구사항: REQ-009 ~ REQ-013, REQ-023, REQ-024

**반올림은 이 마일스톤에서만 구현한다.** M5(클라이언트)에는 어떤 가격 가공 로직도 넣지 않는다 — 클라이언트에 두면 수동 입력까지 반올림되어 REQ-025가 깨진다(spec.md §3.6.1).

`toFixed(2)`를 고른 이유는 "절반 지점이 정확해서가 아니다" — research.md §7.2 실측에서 그 통념은 반증되었다. 명세에 동작이 정의된 단일 연산이고 중간 곱셈이 없다는 점 때문이다. `Number(...)` 감싸기는 필수다(`toFixed`는 문자열 반환).

### M5 — 클라이언트 UI

- `Index.html`: `onData()`에서 심볼 맵을 전역에 보관.
- `Index.html`: `renderPricePanel()` — 심볼이 있는 자산 행에만 "값 가져오기" 버튼 렌더 + 인라인 오류 표시용 슬롯 추가.
- `Index.html`: `fetchAssetPrice(cat)` 신규 — 진행 상태 → RPC → 성공 시 `#pi-<cat>`만 채움 / 실패 시 인라인 오류 + 입력 공백.
- `Index.html`: `applyAssetPrice(cat)` — **변경 없음** 확인.
- `Index.html`: 가격 반올림·서식 로직을 **넣지 않는다**. 서버가 준 값을 그대로 입력 필드에 대입한다(REQ-025 구조적 보장).
- 대응 요구사항: REQ-014 ~ REQ-021, REQ-025

**주의**: `escAttr(cat)`로 만든 `id="pi-<cat>"`는 한글 자산명을 그대로 쓴다. 신규 버튼·오류 슬롯 id도 동일 규칙을 따라 일관성을 유지한다.

### M6 — 문서 갱신 (기계적, 가장 되돌리기 쉬움)

- `CLAUDE.md` 가격 소스 문장 갱신 (§H 소유권 주의).
- `.moai/project/tech.md` 기술 스택 표의 "가격 소스" 행 + "서드파티/외부 의존성" 서술 갱신.
- `.moai/project/codemaps/*.md` 재생성 또는 신규 함수 반영.
- 배포 안내에 OAuth 재승인 절차 추가.
- 대응 요구사항: REQ-022

## §G 안티패턴 (하지 말 것)

- ❌ `Code.gs`에 자산→심볼 하드코딩 맵을 두는 것 — 사용자 정의 자산을 영영 지원 못 한다.
- ❌ `getAssetTypes()` 반환 형식 변경 — §C 기각안.
- ❌ 조회 성공 시 `setAssetPrice`를 함께 호출하는 것 — 2단계 확인 흐름의 핵심을 파괴한다.
- ❌ 조회 실패 시 이전 값을 남기거나 0/1 같은 기본값을 채우는 것 — 사용자가 잘못된 값을 "적용"할 수 있다.
- ❌ `muteHttpExceptions` 생략.
- ❌ "값 가져오기"에 낙관적 렌더링 적용 — 시트에 아직 반영되지 않은 값이 테이블·요약에 섞인다.
- ❌ `updateAssetDropdown_()`을 우회해 `setDataValidation()`을 직접 호출하는 것.
- ❌ 클라이언트(`Index.html`)에서 가격을 반올림하는 것 — 수동 입력까지 잘려 REQ-025가 깨진다.
- ❌ 반올림 결과가 `0`인데 그대로 입력 필드에 채우는 것 — 사용자가 "적용"하면 수익률이 -100%가 된다.
- ❌ `toFixed(2)`의 반환값을 `Number()`로 감싸지 않고 쓰는 것 — 문자열이 반환된다.

## §H 교차 참조 및 소유권 경계

| 문서 | 이 SPEC에서의 취급 |
|------|---------------------|
| `spec.md` | 요구사항 SSOT |
| `acceptance.md` | 인수 시나리오 |
| `research.md` | 바이낸스 응답·오류 모드 실측 근거 |
| `.moai/project/codemaps/dependencies.md` | fan-in 근거 (읽기 전용 참조) |

**소유권 주의 — `CLAUDE.md` / `.moai/project/*.md` 편집**

REQ-022의 문서 갱신은 **이 plan 단계에서 결정만 기록**한다. 실제 파일 편집은 manager-docs가 sync 단계에서 수행하는 것이 소유권 경계에 맞다. run 단계에서 코드와 함께 고치고 싶다면 오케스트레이터가 명시적으로 재위임해야 하며, manager-spec은 `CLAUDE.md`를 직접 편집하지 않는다.

## §I 미해결 항목

### 해소됨

- ~~[NEEDS CLARIFICATION: 기본 심볼 시드 여부]~~ → **확정 (2026-08-23, 사용자)**: **자동 시드한다.** 신규 `AssetTypes` 시트 생성 시 `비트코인→BTCUSDT`, `이더리움→ETHUSDT`, `솔라나→SOLUSDT`를 자동 삽입하고 `금`/`은`/`USDT`/`USDC`는 공란으로 둔다. M1 계획대로 진행하며 변경 없음. 검증은 AC-001.
- ~~[미확인: 바이낸스 가격 소수 자릿수]~~ → **확정 (2026-08-23, 사용자)**: **소수점 둘째 자리 반올림**, 서버(`fetchBinancePrice`) 적용. spec.md §3.6 / research.md §7 참조.
- ~~[NEEDS CLARIFICATION: 심볼 편집 UI 형태]~~ → **확정 (2026-08-23, 사용자)**: **인라인 입력 필드**로 확정(`prompt()` 방식 기각). `Index.html`의 `renderAssetManager()`가 렌더하는 자산 태그 옆에 인라인 입력 필드를 두고 그 자리에서 심볼을 편집한다. 서버 계약(`setAssetSymbol(name, symbol)`)은 이 결정과 무관하게 변경 없음 — 클라이언트 UI 형태에만 영향을 준다. M3 반영 완료(위 §F M3 참조).
- ~~[NEEDS CLARIFICATION: 1센트 미만 자산 처리 방식]~~ → **확정 (2026-08-23, 사용자)**: **안 A — 오류 표시 유지.** 둘째 자리 반올림 결과가 0인데 원본 가격이 0보다 크면 입력 필드를 채우지 않고 `{error}`를 반환한다(잘못된 값을 절대 만들지 않는 쪽을 택함). 이는 plan.md M4 / spec.md REQ-024에 이미 작성된 기본 동작을 그대로 확정하는 결정이며, 코드 계획 변경은 없다. 검증은 AC-017.

  | 안 | 동작 | 채택 여부 |
  |----|------|-----------|
  | A (채택) | 오류 표시 + 입력 필드 공백 | **확정** — 잘못된 값을 절대 만들지 않음. 해당 자산은 바이낸스 조회 기능을 쓸 수 없으나, 수동 입력 경로는 영향 없음 |
  | B (기각) | 0이 되는 경우에 한해 유효 자릿수를 더 유지 | 기각 — 조회는 동작하지만 "둘째 자리" 규칙에 예외가 생겨 계약이 흔들림 |

### 열려 있음

(현재 열려 있는 항목 없음 — 위 4건 모두 해소됨으로 이관되었다.)
