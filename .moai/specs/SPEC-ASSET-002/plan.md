# SPEC-ASSET-002 — 구현 계획

> 마일스톤은 **되돌리기 어려운 결정 순서**로 배열했다. 앞쪽일수록 바뀔 가능성이 크고 리뷰 가치가 높다. 뒤쪽은 기계적 작업이다.

## §A 컨텍스트

| 항목 | 값 |
|------|-----|
| 대상 파일 | `Code.gs`, `Index.html` (2개) |
| 신규 서버 함수 | `setSymbol(name, symbol)` — 판별 + B·C 동시 기록 |
| 수정 클라이언트 함수 | `renderAssetManager()`(입력 필드 2→1), `saveAssetSymbol`·`saveMetalSymbol`(→ `saveSymbol` 통합) |
| 시그니처 변경 | **없음** — `getAssetTypes` / `addAssetType` / `deleteAssetType` / `setAssetPrice` / `getPortfolioData` / `readAssetRows_` 전부 불변 |
| 시트 스키마 변경 | **없음** — `AssetTypes` A/B/C 3열 유지 |
| 서버 조회 관여 | **없음** — 시세 조회 경로는 이 SPEC에서 손대지 않는다 |
| 개발 방식 | 자동화 테스트 스위트 없음 → Apps Script 에디터 수동 실행 + 웹앱 실기 확인 (acceptance.md 기준) |

## §A.5 PRESERVE 목록 (건드리지 않는 것)

다음은 SPEC-PRICE-001·002·SPEC-ASSET-001로 이미 완성된 것들이며, 이 SPEC에서 **회귀 없이 그대로 동작해야 한다**:

- `Code.gs`: `readAssetRows_()`, `getAssetTypes()`, `getPortfolioData()`, `addAssetType()`, `deleteAssetType()`, `setAssetPrice()`, `updateAssetDropdown_()`, `countAssetUsage_()` — 시그니처·동작 전부 불변.
- `Code.gs`: `setAssetSymbol()`, `setMetalSymbol()` — **코드를 남긴다.** UI 호출만 끊고 함수 본문은 손대지 않는다(spec.md §2.5, §6 "Out of Scope — 코드 정리").
- `Index.html`: `fetchAssetPrice()`, `fetchBinancePriceClient_()`, `fetchGoldApiPriceClient_()`, `renderPricePanel()`의 "값 가져오기" 버튼 노출 조건, `applyAssetPrice()` — 전부 불변(spec.md §2.3, REQ-013).
- `Utils.gs`, `PriceFetcher.gs`, `Menu.gs`: 전체 — 이 SPEC은 이 파일들을 손댈 이유가 없다.

## §B 알려진 이슈 / 사전 확인 사항

1. **반대쪽 열을 비우는 동작은 되돌릴 수 없다.** 이 SPEC의 핵심 위험은 여기 하나에 몰려 있다. 사용자가 `BTCUSDT`를 저장하는 순간 그 자산의 C열이 지워지고, 지워진 값은 복구되지 않는다. M1 구현 시 판별 분기를 먼저 확정하고, 실제 기록 전에 Apps Script 에디터에서 함수를 단독 실행해 세 분기(금속 / 바이낸스 / 빈 값)를 각각 확인한 뒤 UI를 연결한다.

2. **대문자 정규화는 기존 저장값에 소급되지 않는다.** REQ-005는 **쓰기 시점**에만 적용된다. 이미 소문자로 저장돼 있던 값은 사용자가 그 자산을 다시 저장할 때까지 그대로다 — 이는 의도된 동작이며(spec.md §2.4 일괄 마이그레이션 금지와 같은 원칙), 결함이 아니다.

3. **`XAU`/`XAG` 판별 규칙은 정확히 두 값만 본다.** `XAUUSD`, `XAU-USD`, `GOLD` 같은 변형은 금속으로 판별되지 **않고** 바이낸스 심볼로 취급돼 B열에 들어간다. 이는 명세대로의 동작이다(REQ-002는 완전 일치를 요구한다). 부분 일치(`startsWith`, `includes`)로 넓히면 `XAUUSDT` 같은 실제 바이낸스 페어를 잘못 판별하게 되므로 **완전 일치를 유지해야 한다**.

4. **입력 필드 id 정리.** 현재 `sym-<자산명>`과 `metalsym-<자산명>` 두 개의 id가 있다. 통합 후에는 하나만 남는다 — 기존 `sym-<자산명>`을 그대로 재사용하는 편이 변경 범위가 작다(`saveAssetSymbol`의 `input.nextElementSibling` 버튼 탐색 패턴도 그대로 쓸 수 있다). `metalsym-*` id와 `metalsym-msg-*` 메시지 span은 제거한다.

5. **`onData()`의 `metalSymbolsMap`은 계속 필요하다.** 통합 입력 필드의 초기 표시값 결정(REQ-010)과 "값 가져오기" 버튼 노출 조건(PRESERVE)이 둘 다 이 맵을 읽는다 — 입력 필드를 하나로 줄인다고 해서 이 전역 변수를 제거하면 안 된다.

## §C 핵심 설계 결정 — 쓰기 시점 1회 판별

spec.md §2.1~§2.2에서 결정된 내용을 구현 관점에서 정리한다.

**채택안 — 판별은 서버 `setSymbol` 안에서 단 한 번**

```
[사용자 입력] → saveSymbol(name)        [Index.html]  값만 전달, 판별하지 않음
                    ↓ google.script.run
                setSymbol(name, symbol) [Code.gs]     ← 판별은 여기서만
                    ↓
                B·C 두 칸을 setValues 1회로 함께 기록
                    ↓
                getPortfolioData() 반환 → 패널 재렌더
```

- **판별을 클라이언트가 아닌 서버에 두는 이유**: 시트에 무엇이 기록될지를 결정하는 규칙과 실제 기록하는 코드가 같은 함수 안에 있어야, 나중에 규칙이 바뀌어도 한 곳만 고치면 된다. 클라이언트에서 판별해 "어느 함수를 부를지" 고르는 방식은 규칙이 두 파일에 흩어진다.
- **B·C를 한 번에 쓰는 이유**: `getRange(행, 2, 1, 2).setValues([[b, c]])` 한 번이면 두 칸이 함께 갱신된다. 열별로 두 번 쓰면 그 사이에 한쪽만 반영된 중간 상태가 존재하고, 두 번째 쓰기가 실패하면 그 상태가 그대로 남는다.
- **세 분기가 모두 "B와 C 둘 다에 값을 지정한다"**: 금속이면 `['', 심볼]`, 바이낸스면 `[심볼, '']`, 빈 값이면 `['', '']`. 분기마다 "어느 열을 비울지"를 따로 생각할 필요가 없고, 반대쪽을 비우는 것을 빠뜨릴 구조적 여지가 사라진다.

**기각안 — 클라이언트에서 판별해 기존 두 함수 중 하나를 호출**: 기존 `setAssetSymbol`/`setMetalSymbol`은 각자 자기 열만 쓰므로 반대쪽 열을 비우는 동작이 없다. 이 방식을 쓰려면 두 함수를 모두 고쳐 "반대쪽 비우기"를 각각 넣어야 하는데, 같은 규칙이 두 곳에 복제된다.

## §D 제약

- 신규 서버 함수는 `JSON.stringify({error})` / `getPortfolioData()` 반환 규약을 따른다.
- `AssetTypes` 시트 열 구조(A/B/C)를 변경하지 않는다.
- 심볼 저장 시 시트 쓰기는 `setValues()` 1회로 제한한다.
- 기존 시트 데이터에 대한 일괄 변경·마이그레이션을 수행하지 않는다.
- 시세 조회 경로 파일·함수를 수정하지 않는다.
- 외부 라이브러리 도입 금지.

## §E 자기 검증

자동화 테스트가 없으므로, 각 마일스톤 종료 시 다음을 실행하고 관찰 결과를 `progress.md` §E.2에 기록한다.

| 검증 | 방법 |
|------|------|
| 판별 3분기 | Apps Script 에디터에서 `setSymbol`을 `XAU` / `xau` / `BTCUSDT` / `''` 네 가지 입력으로 직접 실행 후 시트 B·C 칸 육안 확인 |
| 반대쪽 비우기 | 한 자산에 `BTCUSDT` 저장 → C열 확인 → 같은 자산에 `XAU` 저장 → B열이 비었는지 확인 |
| 미존재 자산 | `setSymbol('없는자산', 'XAU')` 실행 후 반환값과 시트 행 수 확인 |
| 레거시 이중 등록 | 시트에서 손으로 한 자산의 B·C를 모두 채운 뒤 웹앱 새로고침 → 표시값 확인, 저장하지 않은 상태에서 시트 불변 확인 |
| 조회 회귀 | 바이낸스 심볼 자산·금속 심볼 자산 각각 "값 가져오기" → "적용" 흐름 확인 |
| 자산 CRUD 회귀 | 자산 추가/삭제 후 모달 드롭다운·현재가 패널 반영 확인 |
| 시트 쓰기 횟수 | `setSymbol` 코드 리뷰 — `setValue`/`setValues` 호출이 1회인지 확인 |

## §F 마일스톤

### M1 — 서버 판별·기록 함수 (되돌리기 가장 어려움)

- `Code.gs`: `setSymbol(name, symbol)` 신규 작성.
  - 자산명 trim → A열 순회로 행 탐색(기존 `setAssetSymbol`과 동일한 패턴).
  - 미존재 시 `JSON.stringify({error: '존재하지 않는 자산입니다.'})` 반환, 시트 미변경(REQ-006).
  - 심볼 정규화: `String(symbol == null ? '' : symbol).trim().toUpperCase()`(REQ-005).
  - 판별: 정규화 결과가 `'XAU'` 또는 `'XAG'`와 **완전 일치**하면 금속, 비어 있으면 빈 값, 그 외는 바이낸스(§B 이슈 3 — 부분 일치 금지).
  - 기록: `sheet.getRange(행, 2, 1, 2).setValues([[binanceValue, metalValue]])` **1회**(REQ-007).
  - `updateAssetDropdown_()` 미호출(REQ-008) — 기존 두 함수와 동일한 주석 근거를 남긴다.
  - 성공 시 `getPortfolioData()` 반환.
- `setAssetSymbol` / `setMetalSymbol`은 **수정하지 않는다**(PRESERVE, spec.md §2.5).
- 대응 요구사항: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008

**M1 종료 조건**: UI를 연결하기 **전에** Apps Script 에디터 단독 실행으로 §E의 "판별 3분기"·"반대쪽 비우기"·"미존재 자산" 세 항목을 통과시킨다. 여기서 걸러지지 않은 결함은 UI를 거치면 원인 파악이 훨씬 어려워진다.

### M2 — 자산 관리 패널 단일 입력 필드

- `Index.html` `renderAssetManager()`:
  - 두 벌의 `<input class="symbol-input">` + 저장 버튼 + 메시지 span을 **한 벌로 줄인다**.
  - 남기는 id: `sym-<자산명>`, `sym-msg-<자산명>`. 제거: `metalsym-*`, `metalsym-msg-*`(§B 이슈 4).
  - 초기 표시값: `symbol || metalSymbol`(B열 우선, REQ-010).
  - placeholder: `심볼 (예: BTCUSDT, XAU, XAG)`(REQ-011).
- `Index.html`: `saveAssetSymbol(name)` → `saveSymbol(name)`으로 통합하고 `setSymbol`을 호출하도록 변경. `saveMetalSymbol(name)`은 제거한다(호출부가 사라지므로 남길 이유가 없다 — `Code.gs`의 서버 함수 두 개를 남기는 것과는 별개 판단이다).
- `onData()`의 `metalSymbolsMap` 보관은 **유지**(§B 이슈 5).
- 대응 요구사항: REQ-009, REQ-010, REQ-011, REQ-012

### M3 — 조회 경로 불변 확인 (검증만, 코드 변경 없음)

- `renderPricePanel()`의 "값 가져오기" 버튼 노출 조건, `fetchAssetPrice()`의 우선순위 분기, 두 조회 함수 — diff에 나타나지 않는지 확인한다.
- 바이낸스 심볼 자산과 금속 심볼 자산 각각에 대해 "값 가져오기" → "적용" 실기 확인.
- 대응 요구사항: REQ-013

### M4 — 문서 갱신 (기계적, 가장 되돌리기 쉬움)

- `CLAUDE.md`: 자산 관리 패널 설명의 "인라인 심볼 입력 필드" 서술과 `Code.gs` 함수 목록을 갱신 — 심볼 입력이 자산당 하나이며 값의 형태로 종류가 자동 판별된다는 내용(§H 소유권 주의).
- 대응 요구사항: REQ-014

## §G 안티패턴 (하지 말 것)

- ❌ 판별을 클라이언트(`Index.html`)에서 하고 서버 함수 두 개 중 하나를 골라 호출하는 것 — §C 기각안.
- ❌ B열과 C열을 각각 따로 `setValue()`로 두 번 쓰는 것 — REQ-007 위반, 중간 상태가 남는다.
- ❌ `XAU`/`XAG` 판별에 부분 일치(`startsWith` / `includes` / 정규식 부분 매칭)를 쓰는 것 — `XAUUSDT` 같은 바이낸스 페어를 오판한다(§B 이슈 3).
- ❌ 배포 시 기존 이중 등록 행을 자동으로 정리하는 마이그레이션 코드를 넣는 것 — spec.md §2.4에서 명시적으로 기각됨.
- ❌ 조회 경로(`fetchAssetPrice`의 바이낸스 우선 분기 등)를 "이제 필요 없으니" 함께 정리하는 것 — spec.md §2.3, §6 "Out of Scope — 조회 로직".
- ❌ `setAssetSymbol` / `setMetalSymbol` 서버 함수를 삭제하는 것 — spec.md §6 "Out of Scope — 코드 정리", 사용자 승인 없이 하지 않는다.
- ❌ `metalSymbolsMap` 전역 변수를 제거하는 것 — 버튼 노출 조건과 초기 표시값이 아직 이 맵을 읽는다(§B 이슈 5).
- ❌ 심볼 유효성을 저장 전에 API로 확인하려 드는 것 — spec.md §6 "Out of Scope — 데이터 구조".

## §H 교차 참조 및 소유권 경계

| 문서 | 이 SPEC에서의 취급 |
|------|---------------------|
| `spec.md` | 요구사항 SSOT |
| `acceptance.md` | 인수 시나리오 |
| `.moai/specs/SPEC-PRICE-001/*`, `SPEC-PRICE-002/*` | 선행 설계 출처(읽기 전용 참조) |

**소유권 주의 — `CLAUDE.md` 편집**

REQ-014의 문서 갱신은 **이 plan 단계에서 결정만 기록**한다. 실제 파일 편집은 manager-docs가 sync 단계에서 수행한다. manager-spec은 `CLAUDE.md`를 직접 편집하지 않는다.

## §I 미해결 항목

### 열려 있음

- 없음 — 이 SPEC의 설계 결정은 모두 확정됐다.

### 향후 판단을 위한 참고 (이 SPEC의 결정 사항 아님)

- **`setAssetSymbol` / `setMetalSymbol` 삭제 여부**: 이 SPEC 완료 시점에 두 함수는 어디에서도 호출되지 않는다. 삭제는 되돌리기 쉬운 별개 정리 작업이므로 사용자가 판단한다(spec.md §2.5, §6 "Out of Scope — 코드 정리").
- **`fetchAssetPrice`의 바이낸스 우선 분기 정리 여부**: 레거시 이중 등록 행이 시트에서 모두 사라진 것이 확인되면 이 분기는 도달 불가능해진다. 그때 별도로 판단한다(spec.md §2.3).
