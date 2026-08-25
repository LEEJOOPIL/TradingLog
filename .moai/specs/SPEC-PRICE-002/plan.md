# SPEC-PRICE-002 — 구현 계획

> 마일스톤은 **되돌리기 어려운 결정 순서**로 배열했다. 앞쪽일수록 바뀔 가능성이 크고 리뷰 가치가 높다. 뒤쪽은 기계적 작업이다.

## §A 컨텍스트

| 항목 | 값 |
|------|-----|
| 대상 파일 | `Code.gs`, `Utils.gs`, `Index.html` |
| 신규 서버 함수 | `setMetalSymbol(name, symbol)` |
| 수정 서버 함수 | `readAssetRows_()`(A:B→A:C), `getPortfolioData()`(`metalSymbols` 필드 추가) |
| 시그니처 변경 | **없음** — `getAssetTypes` / `addAssetType` / `deleteAssetType` / `setAssetPrice` / `setAssetSymbol` 전부 불변 |
| 신규 시트 열 | `AssetTypes` C열 — `금속시세 심볼` |
| 신규 클라이언트 함수 | `fetchGoldApiPriceClient_(symbol)` (Index.html) |
| 외부 의존 | `gold-api.com` 공개 REST — SPEC-PRICE-001의 바이낸스에 이은 두 번째 외부 API |
| 서버 관여 | **없음** — 조회는 처음부터 클라이언트 `fetch()`. `PriceFetcher.gs`는 이 SPEC에서 변경하지 않는다 |
| 개발 방식 | 자동화 테스트 스위트 없음 → Apps Script 에디터 수동 실행 + 웹앱 실기 확인 (acceptance.md 기준) |

## §A.5 PRESERVE 목록 (건드리지 않는 것)

다음은 SPEC-PRICE-001로 이미 완성된 것들이며, 이 SPEC에서 **회귀 없이 그대로 동작해야 한다**:

- `Code.gs`: `getAssetTypes()`, `addAssetType()`, `deleteAssetType()`, `setAssetSymbol()`, `setAssetPrice()`, `updateAssetDropdown_()`, `countAssetUsage_()` — 시그니처·동작 전부 불변.
- `Index.html`: `fetchBinancePriceClient_()`, `applyAssetPrice()`, `onData()`의 기존 필드 처리, `renderAssetManager()`의 바이낸스 심볼 입력 필드·저장 흐름.
- `Utils.gs`: `ensureAssetSymbolHeader_()`, `initAssetTypesSheet_()`의 기존 B열 헤더·시드 로직.
- `PriceFetcher.gs`: 전체 — 이 SPEC은 서버 조회 함수를 두지 않으므로 이 파일을 손댈 이유가 없다.

## §B 알려진 이슈 / 사전 확인 사항

1. **잘못된 심볼 응답 형태 미검증.** spec.md §2.1 — gold-api.com에 존재하지 않는 심볼을 보냈을 때의 실제 응답(상태 코드·본문)을 이번 계획 단계에서 확인하지 못했다. M2 착수 직후 최소 호출로 먼저 확인하고, 그 결과를 `progress.md`에 기록한다. 확정 전까지는 "200이 아니면 전부 오류"로 방어적으로 처리한다(REQ-010).
2. **`price`는 이미 숫자다.** 바이낸스(`"76258.01000000"`, 문자열)와 달리 gold-api.com은 JSON 숫자를 준다 — `parseFloat()` 문자열 변환 단계가 필요 없다. 다만 `Number()` 감싸기 + `isFinite()` 방어는 그대로 필요하다(응답이 예상과 다른 타입일 가능성에 대비).
3. **동시 등록 우선순위 로직을 빠뜨리기 쉽다.** `fetchAssetPrice(cat)`이 지금은 `assetSymbolsMap` 하나만 본다 — 이번 SPEC에서 `metalSymbolsMap`도 함께 보게 되면, "둘 다 있을 때 바이낸스 우선"(REQ-015) 분기를 반드시 명시적으로 넣어야 한다. 빠뜨리면 금속 심볼이 있는데 조용히 무시되거나, 반대로 바이낸스 심볼이 있는데 금속 API를 호출하는 오동작이 생긴다.
4. **자산 관리 패널에 입력 필드가 하나 늘어난다.** `renderAssetManager()`가 렌더하는 자산 행에 "바이낸스 심볼" 입력 필드 옆에 "금속시세 심볼" 입력 필드를 추가로 둔다 — 기존 필드의 id(`sym-<name>`)와 충돌하지 않는 새 id 규칙이 필요하다(예: `metalsym-<name>`).
5. **CORS는 로컬 curl로 이미 확인됐지만, 실제 배포된 웹앱에서 재확인이 필요하다.** SPEC-PRICE-001 AC-009 노트와 같은 이유 — 로컬 확인이 실제 배포 환경의 성공을 보증하지 않는다.

## §C 핵심 설계 결정 — 별도 열 + OR 조건 + 우선순위 규칙

spec.md §2.3~§2.5에서 이미 결정된 내용을 구현 관점에서 정리한다.

**채택안 — B열과 분리된 C열, 두 심볼 맵을 병렬로 유지**

```
readAssetRows_()            [수정] A:C 단일 getValues() → [{name, symbol, metalSymbol}]
   ├── getAssetTypes()      [불변] 내부 구현은 readAssetRows_()에 이미 의존 — 추가 수정 없음
   └── getPortfolioData()   [수정] assetSymbols(기존) + metalSymbols(신규) 둘 다 조립
```

- `getAssetTypes()`는 이미 `readAssetRows_()`의 반환 배열에서 `name`만 뽑아 쓰므로, `readAssetRows_()`가 세 번째 필드를 추가로 반환해도 **코드 수정이 필요 없다**(다만 회귀 확인은 한다).
- `getPortfolioData()`는 `readAssetRows_()`를 여전히 **1회만** 호출하고, 그 결과에서 `assetSymbols`와 `metalSymbols` 두 맵을 인라인으로 함께 조립한다 — 시트 읽기 횟수 불변.
- 클라이언트는 `onData()`에서 `metalSymbolsMap`을 `assetSymbolsMap`과 병렬로 전역 변수에 저장한다.
- `fetchAssetPrice(cat)`의 분기 로직: 바이낸스 심볼이 있으면 바이낸스 우선(REQ-015) → 없고 금속 심볼만 있으면 gold-api → 둘 다 없으면 애초에 버튼이 렌더되지 않으므로(REQ-013) 이 함수가 호출될 일이 없다.

**기각안 — B열에 두 종류 심볼을 함께 저장(접두사 등으로 구분)**: "이 문자열이 어느 API용인지"를 형식으로 추측해야 하고, 향후 심볼 문자열이 우연히 겹칠 경우(예: 어떤 코인이 `XAU`라는 티커를 쓰게 되는 경우) 조용히 잘못된 API를 호출하게 된다. 열을 분리하면 이런 모호성이 원천적으로 없다.

## §D 제약

- 신규·수정 서버 함수는 `JSON.stringify({...})` 반환 규약을 따른다.
- `AssetTypes` 시트 읽기는 호출당 1회를 유지한다(A:C 동시 읽기).
- 외부 라이브러리 도입 금지. 조회는 브라우저 네이티브 `fetch()`만 사용.
- API 키·시크릿을 코드나 시트에 저장하지 않는다.
- 기존 낙관적 렌더링 동작을 "적용" 경로에서 그대로 유지한다("값 가져오기" 경로에는 적용하지 않는다 — REQ-019).

## §E 자기 검증

자동화 테스트가 없으므로, 각 마일스톤 종료 시 다음을 실행하고 관찰 결과를 `progress.md` §E.2에 기록한다.

| 검증 | 방법 |
|------|------|
| 서버 함수 단독 동작 | Apps Script 에디터에서 함수 직접 실행 + 로그 확인 |
| 회귀 | 자산 추가/삭제, 행 추가/수정/삭제, 요약 카드 값 확인, 기존 바이낸스 조회 흐름 |
| 시트 불변성 | "값 가져오기" 전후 F열 값 비교 |
| 오류 경로 | 존재하지 않는 gold-api.com 심볼(예: `ZZZ`)을 임시 등록해 조회 |
| 우선순위 규칙 | 한 자산에 바이낸스 심볼과 금속 심볼을 모두 등록한 뒤 "값 가져오기" 클릭 → 바이낸스 쪽만 호출되는지 브라우저 개발자 도구 네트워크 탭으로 확인 |

## §F 마일스톤

### M1 — 데이터 모델 및 시트 스키마 (되돌리기 가장 어려움)

- `Utils.gs`: `ensureAssetSymbolHeader_()` 옆에 대응하는 C열 헤더 프로비저닝 로직 추가(또는 기존 함수를 B·C 공통으로 일반화 — 구현 시 판단, 어느 쪽이든 기존 B열 동작은 100% 보존해야 한다). C1이 비었을 때만 `금속시세 심볼` 기록(멱등).
- `Utils.gs`: `initAssetTypesSheet_()`는 **수정하지 않는다** — 금·은 심볼은 자동 시드하지 않기로 결정했으므로(spec.md §2.3), 신규 시트 생성 로직에 C열 시드값을 추가할 필요가 없다. C1 헤더만 멱등하게 보강되면 된다.
- 대응 요구사항: REQ-001, REQ-002, REQ-003

### M2 — 서버 읽기 계층 확장

- `Code.gs`: `readAssetRows_()` — `getRange(2, 1, lastRow - 1, 2)` → `getRange(2, 1, lastRow - 1, 3)`으로 확장, 반환 객체에 `metalSymbol: String(r[2] || '').trim()` 추가.
- `Code.gs`: `getPortfolioData()` — `assetSymbols` 조립 루프 옆에 `metalSymbols` 조립을 추가(같은 `assetRows` 순회 재사용, 별도 시트 읽기 없음).
- **gold-api.com 잘못된 심볼 응답 실측** — M2 착수 직후 최소 1회 curl 또는 브라우저 콘솔로 확인하고 결과를 `progress.md`에 기록한다(§B 이슈 1).
- 대응 요구사항: REQ-004, REQ-005

**회귀 확인 필수**: 자산 추가/삭제 후 B열 드롭다운이 정상 갱신되는지, `getAssetTypes()`가 여전히 `string[]`을 반환하는지 확인한다.

### M3 — 심볼 등록·수정 경로

- `Code.gs`: `setMetalSymbol(name, symbol)` 신규 — `setAssetSymbol`과 동일한 구조로 C열을 기록. 자산명 매칭 → C열 기록 → `getPortfolioData()` 반환. 미존재 자산은 `{error}`.
- `Index.html`: `renderAssetManager()` — 기존 "바이낸스 심볼" 입력 필드(`sym-<name>`) 옆에 "금속시세 심볼" 입력 필드(`metalsym-<name>`)와 저장 버튼을 추가.
- `Index.html`: `saveMetalSymbol(name)` 신규 — `saveAssetSymbol(name)`과 동일한 구조로 `setMetalSymbol`을 호출.
- 대응 요구사항: REQ-006, REQ-007

### M4 — gold-api.com 클라이언트 조회 함수

- `Index.html`: `fetchGoldApiPriceClient_(symbol)` 신규 — `fetchBinancePriceClient_`와 같은 오류 처리 구조(네트워크/CORS 실패, 비 200, JSON 파싱 실패, 수치 변환 실패)를 따르되:
  - 엔드포인트: `https://api.gold-api.com/price/` + `encodeURIComponent(symbol)`.
  - `price` 필드는 이미 숫자이므로 `parseFloat()` 문자열 변환 단계 생략, `Number(raw)` + `isFinite()`로 검증.
  - **소수점 둘째 자리 반올림** — `Number(Number(raw).toFixed(2))`.
  - **0 붕괴 가드** — 반올림 결과가 0인데 원본이 0보다 크면 `{error}` 반환.
  - 성공 `{price, symbol}` / 실패 `{error}`.
- 대응 요구사항: REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-021, REQ-022

**반올림은 이 함수 안에서만 구현한다.** 다른 어디에도 가격 가공 로직을 넣지 않는다 — REQ-023(수동 입력 불변)을 구조적으로 지키기 위함이다(SPEC-PRICE-001 §3.6.1과 동일한 이유).

### M5 — 클라이언트 UI — 버튼 OR 조건 + 우선순위 분기

- `Index.html`: `onData()` — `metalSymbolsMap = d.metalSymbols || {}` 전역 보관 추가.
- `Index.html`: `renderPricePanel()` — 버튼 렌더 조건을 `symbol`(바이낸스) **OR** `metalSymbol`로 확장.
- `Index.html`: `fetchAssetPrice(cat)` — 분기 로직 추가:
  1. `assetSymbolsMap[cat]`이 있으면 → `fetchBinancePriceClient_` 호출(기존 동작, 변경 없음).
  2. 없고 `metalSymbolsMap[cat]`이 있으면 → `fetchGoldApiPriceClient_` 호출.
  3. 둘 다 없으면 → 이 함수가 호출될 일이 없다(버튼이 렌더되지 않으므로).
- `Index.html`: `applyAssetPrice(cat)` — **변경 없음** 확인.
- 대응 요구사항: REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020

### M6 — 문서 갱신 (기계적, 가장 되돌리기 쉬움)

- `CLAUDE.md` 가격 소스 문장 갱신 — "가격 소스" 섹션에 gold-api.com 관련 내용 추가(§H 소유권 주의).
- `.moai/project/tech.md` 기술 스택 표의 "가격 소스" 행 갱신(있는 경우).
- 대응 요구사항: REQ-024

## §G 안티패턴 (하지 말 것)

- ❌ B열과 C열을 하나로 합쳐 접두사 등으로 심볼 종류를 구분하는 것 — §C 기각안.
- ❌ `getAssetTypes()` 반환 형식 변경.
- ❌ 조회 성공 시 `setAssetPrice`를 함께 호출하는 것.
- ❌ 조회 실패 시 이전 값을 남기거나 0/1 같은 기본값을 채우는 것.
- ❌ "값 가져오기"에 낙관적 렌더링 적용.
- ❌ 클라이언트에서 gold-api.com 조회를 위해 서버(`google.script.run`)를 경유하는 것 — 처음부터 클라이언트 직접 호출이 이 SPEC의 아키텍처다.
- ❌ 바이낸스 심볼과 금속 심볼이 둘 다 있을 때 두 API를 모두 호출하거나 결과를 합치는 것 — REQ-015 위반.
- ❌ 반올림 결과가 `0`인데 그대로 입력 필드에 채우는 것.
- ❌ 금·은 심볼을 신규 시트 생성 시 자동 시드하는 것 — spec.md §2.3에서 명시적으로 기각됨(SPEC-PRICE-001의 BTC/ETH/SOL 자동 시드와 의도적으로 다르다).

## §H 교차 참조 및 소유권 경계

| 문서 | 이 SPEC에서의 취급 |
|------|---------------------|
| `spec.md` | 요구사항 SSOT |
| `acceptance.md` | 인수 시나리오 |
| `.moai/specs/SPEC-PRICE-001/*` | 아키텍처·패턴 출처(읽기 전용 참조) |

**소유권 주의 — `CLAUDE.md` / `.moai/project/*.md` 편집**

REQ-024의 문서 갱신은 **이 plan 단계에서 결정만 기록**한다. 실제 파일 편집은 manager-docs가 sync 단계에서 수행한다. manager-spec은 `CLAUDE.md`를 직접 편집하지 않는다.

## §I 미해결 항목

### 열려 있음

- **잘못된 심볼 응답 형태** — §B 이슈 1. M2 착수 시 실측 후 이 절에서 해소로 이관한다.

### 향후 SPEC을 위한 참고 (이 SPEC의 결정 사항 아님)

- 사용자는 향후 주식(국내 코스피·코스닥 + 해외) 시세 조회를 원한다고 밝혔다(spec.md §6.1). 다음 SPEC 착수 시: (a) 국내는 CORS 허용 무료 소스 재조사 필요(네이버 증권 직접 호출은 이번 조사에서 403), (b) 원화→달러 환산 정책 결정 필요, (c) 해외는 야후 파이낸스의 CORS 미허용 문제를 서버 경유로 우회할지, 다른 소스를 찾을지 결정 필요(서버 경유 시 SPEC-PRICE-001이 겪은 구글 클라우드 IP 차단 위험 재검토 필수).
