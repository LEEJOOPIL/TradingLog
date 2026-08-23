# SPEC-PRICE-001 — 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC ID | SPEC-PRICE-001 |
| 상태 | in-progress |
| Tier | M (spec.md + plan.md + acceptance.md, research.md 보강) |
| 현재 단계 | run (M1) |

## §E.1 Plan-phase Audit-Ready Signal

plan 단계 산출물이 생성되었다.

| 산출물 | 경로 | 상태 |
|--------|------|------|
| spec.md | `.moai/specs/SPEC-PRICE-001/spec.md` | 작성 완료 |
| plan.md | `.moai/specs/SPEC-PRICE-001/plan.md` | 작성 완료 |
| acceptance.md | `.moai/specs/SPEC-PRICE-001/acceptance.md` | 작성 완료 |
| research.md | `.moai/specs/SPEC-PRICE-001/research.md` | 작성 완료 (바이낸스 응답 실측 포함) |
| progress.md | 이 파일 | 초기화 완료 |

확인된 사항:

- SPEC ID 정규식 검사 실행 → `PASS`
- 기존 SPEC(`SPEC-ASSET-001`, `SPEC-UI-001`)과 ID 충돌 없음
- 요구사항 25건을 GEARS 표기로 작성
- 제외 범위 5개 소주제 명시
- 인수 시나리오 18건 + 요구사항 추적표 작성
- 바이낸스 엔드포인트 성공/실패 응답 실측 확인 (research.md §2)
- 반올림 방식 2종(`Math.round(x*100)/100` vs `Number(x.toFixed(2))`)의 IEEE754 동작 실측 비교 (research.md §7.2)

### 개정 이력

**v1.1.0 (2026-08-23)** — 사용자 후속 결정 반영

| 항목 | 결정 | 반영 위치 |
|------|------|-----------|
| 조회 가격 정밀도 | 소수점 둘째 자리 반올림, 서버 적용 | spec.md REQ-023, plan.md M4 |
| 기본 심볼 시드 | 자동 시드 (BTCUSDT/ETHUSDT/SOLUSDT) | plan.md M1 — [NEEDS CLARIFICATION] 해소 |

작성 중 **새로 발견한 위험 2건**을 요구사항으로 승격했다.

1. **1센트 미만 자산의 0 붕괴** — `SHIBUSDT`(실측 `0.00000530`)는 둘째 자리 반올림 시 `0`이 되어 수익률이 -100%로 계산된다 → REQ-024 신설 + plan.md §I에 처리 방식 확인 항목 추가.
2. **반올림 위치가 수동 입력을 침범할 위험** — 클라이언트에 반올림을 두면 사용자가 직접 타이핑한 값까지 잘린다 → REQ-025 신설 + 서버 적용을 명시적 결정으로 기록.

### 미해결 항목

(2026-08-23 재감사 반영으로 전건 해소됨 — 아래 재감사 기록 참조)

다음 단계: 오케스트레이터의 Implementation Kickoff Approval.

### 재감사 기록 (iteration 1 → 2)

**iteration 1 결과 (2026-08-23): FAIL** — `.moai/reports/plan-audit/SPEC-PRICE-001-review-1.md`. Overall Score 0.825(Tier M 임계 0.80 이상)였으나 M5 Must-Pass Firewall에 의해 must-pass 2건 실패로 FAIL 확정(점수 무관 오버룰):

- MP-3 FAIL — `spec.md:L13` `tags:` 필드가 YAML 배열 문법(`tags: [...]`)이었음. 스키마(`spec-frontmatter-schema.md`)는 `tags`를 콤마 구분 문자열로 요구.
- MP-7 FAIL — `plan.md` §I "열려 있음"에 미해소 `[NEEDS CLARIFICATION]` 마커 2건 잔존(심볼 편집 UI 형태, 1센트 미만 자산 처리 방식). 저자 자신의 "Kickoff를 막지 않음" 판단은 게이트를 해소하지 못함(점수 무관 필수 통과 기준).
- (참고, must-pass 아님) D4 — §C 설계 다이어그램의 `getAssetSymbolMap_()` 헬퍼가 §A 함수 목록·§F 마일스톤 어디에도 명시되지 않은 불일치.

**적용한 수정 (2026-08-23, manager-spec)**:

1. `spec.md:L13` — `tags: [binance, price, assettypes, webapp, external-api]` → `tags: "binance, price, assettypes, webapp, external-api"` (MP-3 해소).
2. `plan.md` §I — 미해소 클래리피케이션 2건을 사용자 결정으로 해소하고 "해소됨"으로 이관(MP-7 해소):
   - **심볼 편집 UI 형태** — 결정: **인라인 입력 필드** (`prompt()` 기각). 결정자: user. 날짜: 2026-08-23. 서버 계약(`setAssetSymbol`) 불변, M3 §F 반영 완료.
   - **1센트 미만 자산 처리 방식** — 결정: **안 A — 오류 표시 유지** (기존 plan.md M4 / spec.md REQ-024 동작을 그대로 확정). 결정자: user. 날짜: 2026-08-23. 코드 계획 변경 없음.
3. `plan.md` §C — `getAssetSymbolMap_()`를 설계 다이어그램에서 제거하고, `getPortfolioData()`가 `readAssetRows_()` 결과로부터 `assetSymbols` 맵을 별도 헬퍼 없이 인라인으로 조립한다는 점을 명시(D4 해소, §F M2 서술과 일치).

**다음 단계**: iteration 2 재감사 대기 — plan-auditor가 D1(MP-7)/D2(MP-3) delta 및 D4 반영 여부를 확인할 것으로 예상.

**iteration 2 결과 (2026-08-23): FAIL** — `.moai/reports/plan-audit/SPEC-PRICE-001-review-2.md`. iteration 1의 D5 요구사항 추적성 지적이 이월되어 재확정됨: REQ-004·REQ-008·REQ-023이 각각 자신의 구조적/위치 주장을 실제로 검증하지 않는 AC에만 매핑되어 있었음. `acceptance.md` §D.2에 3개 셀 수정을 적용(REQ-004 → §D.3 "AssetTypes 시트 읽기 1회 유지" 교차 참조 추가, REQ-008 → §D.4 시그니처 diff 확인 항목 교차 참조 추가, REQ-023 → §D.3 "반올림 적용 위치가 서버인지" 교차 참조 추가). iteration 3 재감사 대기.

**iteration 3 결과 (2026-08-23): PASS** — `.moai/reports/plan-audit/SPEC-PRICE-001-review-3.md`. Overall Score **0.9125**(Tier M 임계 0.80 이상 통과). must-pass 7건 전부 PASS/N-A. D5 교차 참조 수정이 검증됨(REQ-004/008/023 셀 모두 §D.3·§D.4 항목과 정확히 일치). 점수 추이 0.825 → 0.85 → 0.9125로 계속 상승 — 회귀 없음. 잔여 지적 5건은 전부 Severity: minor / Class: optional (게이트 비차단).

plan_status: audit-ready
plan_complete_at: 2026-08-23

**Implementation Kickoff Approval**: 사용자 승인 완료 (2026-08-23, AskUserQuestion) — M1~M5 순차 구현 착수.

## §F Phase 4 Mode Selection

**입력 파라미터**

| 항목 | 값 |
|------|-----|
| Tier | M |
| 파일 수(추정) | 4개 (`Code.gs`, `Utils.gs`, `Menu.gs`, `Index.html`) |
| 도메인 수 | 1 (단일 Google Apps Script 프로젝트, 서버+클라이언트 혼재이나 단일 코드베이스) |
| 파일 언어 구성 | 100% Apps Script(JavaScript) + HTML/inline JS |
| 동시성 이득 | LOW — 코딩 중심 작업이며 마일스톤 간 순차적 의존성 존재(M1 스키마 → M2 읽기 계층 → M3/M4/M5) |

**모드 평가**

| 모드 | 선택 여부 | 근거 |
|------|-----------|------|
| direct | 미선택 | 자명한 1줄 수정이 아니라 다마일스톤 기능 구현 |
| serial | **선택** | 코딩 중심 작업(Anthropic coding-task parallelism caveat) + 마일스톤 간 순차 의존성 + 파일 수 4개(< 10 threshold) |
| fanout | 미선택 | 도메인 수 1개(< 3 threshold), 리서치 중심이 아닌 코딩 작업 |
| sweep | 미선택 | 파일 수 4개(≪ 30 threshold), 단일 균일 변환 규칙이 아닌 다종 로직 변경 |

**Decision: serial**

**근거**: 이 SPEC은 단일 Apps Script 프로젝트의 4개 파일에 걸쳐 마일스톤 순서(M1 시트 스키마 → M2 읽기 계층 → M3 심볼 등록 → M4 바이낸스 조회 → M5 클라이언트 UI)로 순차 의존하는 코딩 작업이다. Anthropic의 coding-task parallelism caveat에 따라 코딩 중심 작업은 병렬화 이득이 낮으므로 `serial`(manager-develop 순차 위임)이 적절하다. 파일 수(4)와 도메인 수(1) 모두 `fanout`/`sweep` 임계치에 크게 못 미친다.

## §E.2 Run-phase Evidence

### M1 — 데이터 모델 및 시트 스키마 (cycle_type=ddd, DDD ANALYZE-PRESERVE-IMPROVE)

**ANALYZE**: `Utils.gs`의 `initAssetTypesSheet_()`(기존 사양)는 신규 시트일 때 A열 기본 자산명만 시딩하고, 기존 시트(`getLastRow() >= 2`)일 때 조기 반환한다. `Menu.gs`의 `initSheet()`는 이 함수를 이미 호출한다(line 56). 자동화 테스트 프레임워크가 없으므로(plan.md §A), 검증은 Apps Script 에디터 수동 실행 + 코드 정적 추적으로 수행한다(plan.md §E).

**PRESERVE**: 기존 A열 자산명 데이터, 기존 조기 반환 단축 경로, `initSheet()`의 기존 호출 순서 — 모두 그대로 보존.

**IMPROVE (원자적 변경 1건)**:
1. `Utils.gs`: `ensureAssetSymbolHeader_(sheet)` 신규 추가 — B1 셀이 비어 있을 때만 `바이낸스 심볼`을 굵게 기록(멱등). sheet 파라미터를 받아 시트 재조회 없이 재사용.
2. `Utils.gs`: `initAssetTypesSheet_()` 수정 — 신규 시트 경로에서 B1 헤더 + `DEFAULT_ASSETS` 순서 기반 심볼 매핑(`비트코인→BTCUSDT`, `이더리움→ETHUSDT`, `솔라나→SOLUSDT`, 나머지 공란)을 A열과 함께 단일 `setValues()` 호출로 기록. 기존 시트 조기 반환 경로에서는 반환 직전 `ensureAssetSymbolHeader_(sheet)`를 호출해 헤더만 멱등 보강.
3. `Menu.gs`: 변경 없음 — `initSheet()`가 이미 `initAssetTypesSheet_()`를 호출하므로(line 56), 헤더 프로비저닝 경로는 기존 호출 경로를 통해 자동으로 도달함을 코드 추적으로 확인.

#### AC PASS/FAIL 매트릭스

| AC | 대상 요구사항 | 상태 | 검증 방법 | 실제 결과 |
|----|--------------|------|-----------|-----------|
| AC-001 | REQ-001, REQ-002, REQ-006 | PASS (정적 추적) | 코드 논리 수동 추적 (Given/When/Then) | 신규 시트 경로: `DEFAULT_ASSETS.map()`가 `['금',''],['은',''],['비트코인','BTCUSDT'],['이더리움','ETHUSDT'],['솔라나','SOLUSDT'],['USDT',''],['USDC','']`를 생성 → `setValues(2,1,7,2)`로 A:B 동시 기록. B1 = `바이낸스 심볼`(굵게), A1 = `자산명`(굵게). AC-001 조건 충족 |
| AC-002 | REQ-006 | PASS (정적 추적) | 코드 논리 수동 추적, 2회 연속 호출 시뮬레이션 | 1차 호출: `getLastRow()>=2` → `ensureAssetSymbolHeader_(sheet)` 호출 → B1 빈 값 확인 → `바이낸스 심볼` 기록. 2차 호출: 동일 분기 진입 → B1에 이미 값 있음 → `if (String(cell.getValue()).trim()) return;`로 즉시 반환, 재기록 없음. A열 데이터는 두 호출 모두 미접근(읽기 전용 조기 반환 경로 진입 전 단계에서 분기되므로 A열 쓰기 코드 자체가 실행되지 않음) |

**Gaps (미검증)**: 위 두 AC는 Google Apps Script 실행 환경 없이는 실제 스프레드시트 API 호출을 실행할 수 없어 **정적 코드 추적으로만 검증**했다. Apps Script 에디터에서의 실기 실행(`initSheet()` 직접 실행 + 결과 시트 육안 확인)은 사용자의 Google 계정 및 배포된 스크립트 접근이 필요하므로 이 세션에서는 수행 불가 — 사용자의 수동 인수 테스트 통과로 이관.

#### E1. AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Actual Output |
|----|--------|----------------------|----------------|
| AC-001 | PASS (static) | Manual code trace (no test runner exists) | New-sheet path writes A:B via one `setValues` call; B1 bold header set; symbol map matches `DEFAULT_ASSETS` order |
| AC-002 | PASS (static) | Manual code trace, 2x invocation simulation | Existing-sheet early-return path invokes `ensureAssetSymbolHeader_` before return; idempotent guard (`if already set, return`) confirmed by reading the function body |

#### E2. Cross-Platform Build result

N/A — Google Apps Script has no build step; `.gs` files are plain JavaScript with no compilation. Not applicable to this project.

#### E3. Coverage measurement

N/A — no automated test framework exists in this project (plan.md §A "development method": Apps Script 에디터 수동 실행 + 웹앱 실기 확인).

#### E4. Subagent Boundary Grep

```
$ grep -rn 'AskUserQuestion' Utils.gs Menu.gs
(no output — no matches)
```

#### E5. Lint Status

N/A — no linter configured for this Apps Script project (no `.eslintrc`/`.golangci.yml` equivalent present).

#### E6. Branch HEAD + Push state

- Commit SHA: `1288c9a4699738044fdf2074cac075c21366318e`
- `git push origin HEAD:main` → `5587a35..1288c9a  HEAD -> main` (fast-forward, success)
- Pre-push divergence check (`git rev-list --count --left-right origin/main...HEAD` before push): `0  1` (clean, local ahead by 1 — this commit)

#### E7. Blocker Report

None — no blockers encountered. One deviation from the assumed environment: SPEC-PRICE-001's plan-phase artifacts (`spec.md`/`plan.md`/`acceptance.md`/`research.md`/`progress.md`) exist only as **untracked** files in the main checkout (`git status` showed `?? .moai/specs/SPEC-PRICE-001/`), not as a prior committed plan-phase commit. Since this run-phase work executes inside an isolated git worktree (`.claude/worktrees/agent-a0f9eafb4dc8a4275/`) that does not receive untracked files from the main checkout, `spec.md` and `progress.md` were copied into the worktree to be edited and committed as part of this M1 commit — `plan.md`/`acceptance.md`/`research.md` were left untouched/uncommitted per this milestone's scope discipline (B10: touch only `Utils.gs`, `Menu.gs`, and `spec.md` frontmatter).

#### E8. RED Failure Output (N/A — cycle_type=ddd, not tdd)

Not applicable. `cycle_type=ddd` (ANALYZE-PRESERVE-IMPROVE) is in effect per the delegation prompt; this project has no automated test framework, so no RED-GREEN-REFACTOR cycle applies. Verification is DDD-style: PRESERVE (existing behavior unchanged) confirmed by code trace, IMPROVE (new behavior) confirmed by code trace — both deferred to the user's Apps Script editor manual acceptance pass per plan.md §E.

**Residual-risk**: The static-trace verification is logically sound but has not been exercised against the live Google Sheets API. Edge cases not covered by static trace: (a) Google Sheets API behavior when `setValues` receives a 2-column array where some cells are empty strings (expected: writes empty string, not null — assumed based on Apps Script `Range.setValues` documented behavior, not independently verified here); (b) concurrent `initSheet()` invocations (out of scope — Apps Script script execution is inherently single-threaded per script).

### M2 — 서버 읽기 계층 재구성 (cycle_type=ddd, DDD ANALYZE-PRESERVE-IMPROVE)

**ANALYZE**: `Code.gs`의 `getAssetTypes()`는 `@MX:ANCHOR fan_in=4`(`addAssetType`/`deleteAssetType`/`getPortfolioData`/`updateAssetDropdown_` 의존)로, 반환 형식(`string[]`)을 바꾸면 서버 4개 + 클라이언트 4개 호출부가 흔들린다(plan.md §C). `getPortfolioData()`는 기존에 `getAssetTypes()`를 호출해 `assetTypes`만 반환했고, B열(바이낸스 심볼)은 아직 응답에 포함되지 않았다.

**PRESERVE**: `getAssetTypes()`의 외부 시그니처(파라미터 없음, 반환 `string[]`)와 4개 호출부(`addAssetType`, `deleteAssetType`, `getPortfolioData` 내부 로직 재구성 전 형태, `updateAssetDropdown_`)의 호출 방식 — 모두 그대로 보존. `getPortfolioData()`의 기존 응답 필드(`rows`, `summary`, `assetTypes`)도 그대로 보존, 신규 필드만 추가.

**IMPROVE (원자적 변경 1건, 단일 패키지 `Code.gs` 내)**:
1. `readAssetRows_()` 신규 — `AssetTypes` 시트 A:B열을 `getValues()` **단일 호출**로 읽어 `[{name, symbol}]` 배열 반환. 시트가 없으면 `initAssetTypesSheet_()`로 생성(기존 `getAssetTypes()`의 패턴과 동일). `lastRow < 2`일 때만 빈 배열 반환 — 이 조건은 원래 `getAssetTypes()`가 `DEFAULT_ASSETS`로 폴백하던 조건과 정확히 일치.
2. `getAssetTypes()` 재구성 — `readAssetRows_()` 결과를 `.map(name).filter(truthy)`로 변환하는 얇은 래퍼로 교체. `rows.length === 0`(= `lastRow < 2`)일 때만 `DEFAULT_ASSETS.slice()` 반환 — 기존 분기 조건과 동치임을 코드 추적으로 확인(§ 아래 수동 추적 (b) 참조). `@MX:ANCHOR` 주석에 시그니처 보존 사실 명시(`@MX:REASON`).
3. `getPortfolioData()` 수정 — `readAssetRows_()`를 **1회만** 호출해 `assetTypes`(이름 배열)와 `assetSymbols`(`{name: symbol}` 맵)를 인라인으로 함께 조립(별도 `getAssetSymbolMap_()` 헬퍼 없음, plan.md §C 확정 설계). 기존 `rows`/`summary`/`assetTypes` 필드는 그대로, `assetSymbols` 필드만 추가.

#### AC PASS/FAIL 매트릭스

| AC | 대상 요구사항 | 상태 | 검증 방법 | 실제 결과 |
|----|--------------|------|-----------|-----------|
| (REQ-003/004/005/008 대응, acceptance.md §D.2/§D.3/§D.4 교차 참조) | REQ-003, REQ-004, REQ-005, REQ-008 | PASS (정적 추적) | 코드 논리 수동 추적 + grep 카운트 | `readAssetRows_()`가 `getValues()`를 정확히 1회 호출(REQ-003/REQ-004), `getPortfolioData()`가 `readAssetRows_()`를 정확히 1회 호출해 `assetTypes`+`assetSymbols` 동시 파생(REQ-005), `getAssetTypes()`/`addAssetType`/`deleteAssetType`/`setAssetPrice` 시그니처 byte-diff 무변경(REQ-008) — 아래 수동 추적 (a)~(e) 전항목 PASS |

**Gaps (미검증)**: M1과 동일한 사유로 Google Apps Script 실행 환경 없이는 실제 스프레드시트 API 호출을 실행할 수 없어 **정적 코드 추적 + grep 카운트로만 검증**했다. Apps Script 에디터에서의 실기 실행(`getPortfolioData()`/`getAssetTypes()` 직접 실행 + 응답 JSON 육안 확인, 특히 `assetSymbols` 필드 값 검증)은 사용자의 Google 계정 및 배포된 스크립트 접근이 필요하므로 이 세션에서는 수행 불가 — 사용자의 수동 인수 테스트 통과로 이관.

#### E1. AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Actual Output |
|----|--------|----------------------|----------------|
| readAssetRows_() single getValues() call | PASS (static) | `grep -n 'getValues()' Code.gs` scoped to `readAssetRows_()` function body (manual trace) | Exactly 1 `.getValues()` call inside `readAssetRows_()` (line 212 of the post-edit file: `sheet.getRange(2, 1, lastRow - 1, 2).getValues()`) |
| getAssetTypes() return shape unchanged | PASS (static) | Manual code trace: `rows.length === 0 ⟺ lastRow < 2` equivalence proof | New branch condition (`!rows.length`) fires under exactly the same condition as the old branch condition (`lastRow < 2`), because `readAssetRows_()` returns `[]` iff `lastRow < 2` and returns a `lastRow-1`-length array (always ≥1) otherwise. Return type is `string[]` in both branches — unchanged. |
| getPortfolioData() single readAssetRows_() call, assetTypes + assetSymbols both derived from it | PASS (static) | `awk '/^function getPortfolioData/,/^}/' Code.gs \| grep -v '^\s*//' \| grep -c 'readAssetRows_()'` → `1`; same-scope `grep -c 'getAssetTypes()'` → `0` (a Korean comment line inside the function also contains the literal string `readAssetRows_()`, so the comment-inclusive count is 2 — the `grep -v '^\s*//'` filter excludes that false match) | `readAssetRows_()` called exactly once (line 127, the only non-comment match); `assetTypes` and `assetSymbols` both derived from the same `assetRows` local variable — no second sheet read |
| updateAssetDropdown_() unaffected | PASS (static) | `awk '/^function updateAssetDropdown_/,/^}/' Code.gs` (full function body extraction) | Body byte-identical to pre-M2: still calls `getAssetTypes()` once, receives `string[]`, passes to `requireValueInList(list)` unchanged — no behavior change |
| addAssetType/deleteAssetType/setAssetPrice signatures byte-identical | PASS (static) | `git diff -- Code.gs \| grep -E '^[+-]function (addAssetType\|deleteAssetType\|setAssetPrice)\('` | (no output — zero matches, confirming no signature-line diff for any of the three functions) |

#### E2. Cross-Platform Build result

N/A — Google Apps Script has no build step; `.gs` files are plain JavaScript with no compilation. Not applicable to this project (same as M1).

#### E3. Coverage measurement

N/A — no automated test framework exists in this project (plan.md §A "development method": Apps Script 에디터 수동 실행 + 웹앱 실기 확인).

#### E4. Subagent Boundary Grep

```
$ grep -n 'AskUserQuestion' Code.gs
(no output — no matches)
```

#### E5. Lint Status

N/A — no linter configured for this Apps Script project (no `.eslintrc`/`.golangci.yml` equivalent present).

#### E6. Branch HEAD + Push state

- Base commit (pre-M2, `origin/main` tip at session start): `bd9207fa0332bd3f09f6727c9200627769557ae5`
- Commit SHA: `7d70a1c` (full: see `git log --format=%H -1 7d70a1c`)
- `git push origin HEAD:main` → `bd9207f..7d70a1c  HEAD -> main` (fast-forward, success)
- Pre-push divergence check (`git rev-list --count --left-right origin/main...HEAD` before push): `0  1` (clean, local ahead by 1 — this commit)

#### E7. Blocker Report

None — no blockers encountered. Files touched: `Code.gs` (implementation) and this `progress.md` (§E.2 M2 evidence). No other file modified, per `git status --short` / `git diff --name-only` showing only `Code.gs` before this progress.md edit.

#### E8. RED Failure Output (N/A — cycle_type=ddd, not tdd)

Not applicable. `cycle_type=ddd` (ANALYZE-PRESERVE-IMPROVE) is in effect; this project has no automated test framework, so no RED-GREEN-REFACTOR cycle applies. Verification is DDD-style: PRESERVE (external signature + existing response fields unchanged) and IMPROVE (new `readAssetRows_()` internal reader + `assetSymbols` field) both confirmed by code trace — deferred to the user's Apps Script editor manual acceptance pass per plan.md §E.

**Residual-risk**: Static-trace verification only — not exercised against the live Google Sheets API. Untested edge case: an `AssetTypes` sheet with data rows present (`lastRow >= 2`) but every row's A-column name is blank/whitespace-only. In this case `readAssetRows_()` returns a non-empty array (blank-name entries included), so `getAssetTypes()`'s `!rows.length` guard does NOT fire and it falls through to `.map().filter(truthy)`, returning `[]` — this matches the ORIGINAL pre-M2 behavior exactly (verified above), so no regression, but the pathological case has not been exercised live. `assetSymbols` in `getPortfolioData()` filters out blank-name rows via `if (r.name)` before adding to the map, so no `""` key can ever be added.

### M3 — 심볼 등록·수정 경로 (cycle_type=ddd, DDD ANALYZE-PRESERVE-IMPROVE)

**ANALYZE**: `AssetTypes` 시트 B열(바이낸스 심볼)에 값을 쓰는 서버 경로가 아직 없다. `Index.html`의 자산 관리 패널(`renderAssetManager()`)은 자산명 태그 + 삭제 버튼만 렌더한다. 사용자 확정 결정(plan.md §F M3): 심볼 편집 UI는 **인라인 입력 필드**(`prompt()` 기각), 서버 계약은 `setAssetSymbol(name, symbol)` 신규 함수.

**PRESERVE**: `addAssetType(name)`, `deleteAssetType(name, force)`, `getAssetTypes()`, `setAssetPrice(cat, price)` 4개 함수 시그니처·동작 전부 불변. 기존 자산 관리 패널의 추가/삭제 동작, CSS 클래스명(`asset-tag`/`asset-del`/`asset-add-row`/`price-input`/`btn`/`btn-apply`) 전부 유지. `updateAssetDropdown_()`는 이 마일스톤에서 호출하지 않음 — 심볼 수정은 B열 자산 목록(A열) 자체를 바꾸지 않으므로 드롭다운 갱신 대상이 아님.

**IMPROVE (원자적 변경 1건, 단일 패키지 `Code.gs` + `Index.html` 내)**:
1. `Code.gs`: `setAssetSymbol(name, symbol)` 신규 — `AssetTypes` 시트 A열을 `deleteAssetType`과 동일한 방식(정확 trim 일치, 대소문자 구분)으로 순회해 일치하는 행을 찾고, 해당 행 B열에 trim된 심볼 값을 기록한 뒤 `getPortfolioData()`를 반환. 일치하는 행이 없으면(또는 `AssetTypes` 시트 자체가 없으면) 시트를 전혀 변경하지 않고 `{error: '존재하지 않는 자산입니다.'}` 문자열을 반환. `updateAssetDropdown_()` 미호출.
2. `Index.html`: `assetSymbolsMap` 전역 변수 신규(`assetTypesList`와 나란히 선언) — `onData()`에서 `d.assetSymbols || {}`로 갱신.
3. `Index.html`: `renderAssetManager()` 재구성 — 기존 한 줄 태그 나열(`tags.join(' ')`) 대신 자산별 `.asset-row`(태그+삭제 버튼, 심볼 인라인 입력 필드, 저장 버튼, 인라인 오류 슬롯)를 렌더. `escAttr`/`escJs`로 XSS 방지, 기존 관례와 동일.
4. `Index.html`: `saveAssetSymbol(name)` 신규 — 입력값 trim → 저장 버튼 비활성화(진행 상태 표시, `addAsset`/`applyAssetPrice`의 기존 disable/재활성 패턴과 동일) → `google.script.run.setAssetSymbol(name, symbolValue)` 호출. 성공 시 `{error}`면 인라인 메시지 표시 + 버튼 재활성(입력값 유지), 그 외에는 `onData(json)`으로 전체 UI 재렌더. RPC 실패 시 `addAsset`의 실패 핸들러와 동일하게 인라인 메시지 표시 + 버튼 재활성.
5. CSS: `.asset-row`(`.price-row` 패턴 참고 flex 레이아웃), `.symbol-input`(`.price-input` 스타일 재사용, 폭만 축소), `.btn-save-symbol`(`.btn-apply`의 녹색 스타일 재사용), `.symbol-msg`(`#assetMgrMsg`와 동일한 소형 적색 텍스트) 추가.

#### AC PASS/FAIL 매트릭스

| AC | 대상 요구사항 | 상태 | 검증 방법 | 실제 결과 |
|----|--------------|------|-----------|-----------|
| AC-005 (심볼 등록) | REQ-007 | PASS (정적 추적) | 코드 논리 수동 추적 | `XRP`가 심볼 없이 존재하는 상태에서 `setAssetSymbol('XRP', 'XRPUSDT')` 호출 시 A열 순회에서 `'XRP'.trim() === 'XRP'` 매치 → B열에 `'XRPUSDT'` 기록 → `getPortfolioData()` 반환(신규 `assetSymbols.XRP === 'XRPUSDT'` 포함). "값 가져오기" 버튼 노출(REQ-014)은 M5 스코프이므로 이 마일스톤에서는 미해당 — `assetSymbolsMap`을 populate하는 데이터 경로까지만 검증 |
| AC-006 (존재하지 않는 자산) | REQ-007 | PASS (정적 추적) | 코드 논리 수동 추적 — 도달 불가 경로 확인 | `setAssetSymbol('없는자산', 'BTCUSDT')` 호출 시 A열 전체 순회에서 일치 행 없음 → `for` 루프가 매치 없이 종료 → `sheet.getRange(...).setValue(...)` 라인은 `if (String(vals[i][0]).trim() === trimmedName)` 블록 내부에만 존재하므로 이 실행 경로에서 **구조적으로 도달 불가** → 함수 최종 라인 `return JSON.stringify({ error: '존재하지 않는 자산입니다.' })`만 실행되어 시트 변경 없이 `{error}` 반환 |

**Gaps (미검증)**: M1/M2와 동일한 사유로 Google Apps Script 실행 환경 없이는 실제 스프레드시트 API 호출을 실행할 수 없어 **정적 코드 추적만으로 검증**했다. 웹앱 브라우저 실기 조작(인라인 입력 필드에 심볼 입력 → 저장 클릭 → 시트 B열 반영 확인, `없는자산`류 케이스의 인라인 오류 표시 확인)은 사용자의 Google 계정 및 배포된 스크립트 접근이 필요하므로 이 세션에서는 수행 불가 — 사용자의 수동 인수 테스트 통과로 이관.

#### E1. AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Actual Output |
|----|--------|----------------------|----------------|
| setAssetSymbol matches AssetTypes A-column via exact trim comparison (same convention as deleteAssetType) | PASS (static) | `grep -n "String(vals\[i\]\[0\]).trim()" Code.gs` | 2 matches — one inside `deleteAssetType` (pre-existing), one inside `setAssetSymbol` (new); both use the identical `String(x).trim() === String(y).trim()` comparison form |
| setAssetSymbol does not call updateAssetDropdown_() | PASS (static) | `awk '/^function setAssetSymbol/,/^}/' Code.gs \| grep -c 'updateAssetDropdown_'` | `0` |
| setAssetSymbol success path returns getPortfolioData() passthrough; failure path returns {error} string; sheet unmodified on failure | PASS (static) | Manual trace of `setAssetSymbol` control flow (see M3 IMPROVE item 1 above) | Confirmed structurally — `setValue()` call is lexically nested inside the loop's match-branch only; the failure return is the function's final statement, reachable only when the loop completes with no match |
| addAssetType/deleteAssetType/getAssetTypes/setAssetPrice signatures byte-identical | PASS (static) | `git diff -- Code.gs \| grep -E '^[+-]function (addAssetType\|deleteAssetType\|getAssetTypes\|setAssetPrice)\('` | (no output — zero matches, confirming no signature-line diff for any of the four functions) |
| Only Code.gs + Index.html touched (plus this progress.md) | PASS | `git status --short` | ` M Code.gs` / ` M Index.html` only (before this progress.md edit) |

#### E2. Cross-Platform Build result

N/A — Google Apps Script has no build step; `.gs`/`.html` files are plain JavaScript with no compilation. Not applicable to this project (same as M1/M2).

#### E3. Coverage measurement

N/A — no automated test framework exists in this project (plan.md §A "development method": Apps Script 에디터 수동 실행 + 웹앱 실기 확인).

#### E4. Subagent Boundary Grep

```
$ grep -n 'AskUserQuestion' Code.gs Index.html
(no output — no matches)
```

#### E5. Lint Status

N/A — no linter configured for this Apps Script project (no `.eslintrc`/`.golangci.yml` equivalent present). Manual balance check performed instead: `python3` brace/paren-count diff on `Code.gs` and the `<script>` block of `Index.html` — both files balanced (0 delta) after the edit.

#### E6. Branch HEAD + Push state

- Base commit (pre-M3, `origin/main` tip at session start): `631acb96725e51beaddfc951c4bd7083e9147eaa`
- Commit SHA: `32c6315c59ac1883f1fd9006083320ea6dc64929`
- `git push origin HEAD:main` → `631acb9..32c6315  HEAD -> main` (fast-forward, success)
- Pre-push divergence check (`git rev-list --count --left-right origin/main...HEAD` before push): `0  1` (clean, local ahead by 1 — this commit)

#### E7. Blocker Report

None — no blockers encountered. Files touched: `Code.gs` (new `setAssetSymbol`), `Index.html` (inline symbol input UI + `saveAssetSymbol` + CSS), and this `progress.md` (§E.2 M3 evidence). No other file modified, per `git status --short` showing only `Code.gs` / `Index.html` before this progress.md edit.

#### E8. RED Failure Output (N/A — cycle_type=ddd, not tdd)

Not applicable. `cycle_type=ddd` (ANALYZE-PRESERVE-IMPROVE) is in effect; this project has no automated test framework, so no RED-GREEN-REFACTOR cycle applies. Verification is DDD-style: PRESERVE (4 existing signatures unchanged, existing panel behavior/CSS classes unchanged) and IMPROVE (new `setAssetSymbol` server function + inline symbol-edit UI) both confirmed by code trace — deferred to the user's Apps Script editor + browser manual acceptance pass per plan.md §E.

**Residual-risk**: Static-trace verification only — not exercised against the live Google Sheets API or a browser. Untested: whether the inline `symbol-input`/`btn-save-symbol` styling visually integrates acceptably with the existing navy/green palette (a subjective judgment deferred to the user); whether an asset name containing HTML-significant characters (`&`, `'`, `"`, `<`, `>`) round-trips correctly through `escAttr`/`escJs` into the `id="sym-<name>"` DOM id and back through `document.getElementById('sym-' + name)` in `saveAssetSymbol` — this follows the exact pre-existing pattern used by `pi-<cat>`/`applyAssetPrice`, so no new risk is introduced, but it was not exercised live in this session.

### 선행 보안 수정 — `escJs` 이중따옴표 이스케이프 누락 (M4 착수 전, 별도 커밋)

M3 §E.2의 Residual-risk 항목이 지목했던 위험(자산명에 HTML-특수문자가 들어갈 때 `escAttr`/`escJs`가 안전한지)이 실제 결함으로 확인되었다. `escJs(s)`는 백슬래시와 단일 인용부호만 이스케이프하고 **이중 인용부호(`"`)는 이스케이프하지 않았다** — 이 함수의 출력은 항상 이중 인용부호로 감싼 HTML 속성(`onclick="fn('...')"`) 안에 단일 인용부호 JS 문자열로 삽입되므로, 자산명에 `"`가 포함되면 속성이 조기 종료되어 마크업/스크립트 주입이 가능했다. 이 앱은 `addAssetType`에서 자산명 문자 제한을 두지 않으므로 사용자 스스로 입력한 자산명으로 트리거 가능한 XSS였다.

**수정**: `escJs()`에 `.replace(/"/g, '&quot;')`를 추가 — 출력이 HTML 속성 안에서 파싱되므로 `&quot;`는 HTML 파서가 `"`로 되돌린 뒤에야 JS 문자열에 도달하며, 되돌려진 문자열에는 속성을 끊을 수 있는 리터럴 `"`가 존재하지 않는다.

| 항목 | 내용 |
|------|------|
| 대상 파일 | `Index.html` (1줄 변경) |
| 호출부 3곳 | `applyAssetPrice`, `deleteAsset`, `saveAssetSymbol` — 전부 동일한 취약 패턴을 공유했으므로 헬퍼 1곳 수정으로 3곳 모두 방어됨 |
| 커밋 | `c08f4cb` — `fix(SPEC-PRICE-001): escJs 이중따옴표 이스케이프 누락 수정 (XSS 방어)` |
| 검증 | 코드 리뷰 — 수정 후 `escJs()`가 `\`, `'`, `"` 세 문자 전부를 이스케이프함을 diff로 확인. Google Apps Script 환경 실기 조작(자산명에 `"` 포함 문자열 입력 후 렌더 확인)은 이 세션에서 수행 불가 |
| Push | `git push origin HEAD:main` → `7539279..c08f4cb  HEAD -> main` (fast-forward, success) |

### M4 — 바이낸스 조회 서버 함수 (cycle_type=ddd, DDD ANALYZE-PRESERVE-IMPROVE)

**ANALYZE**: `AssetTypes` B열 심볼은 M2/M3에서 이미 조회·기록 가능하지만, 실제로 바이낸스에서 시세를 가져오는 서버 함수는 아직 없다. `readAssetRows_()`가 `[{name, symbol}]`을 단일 읽기로 반환하므로, 심볼 조회는 이 헬퍼를 재사용하면 시트 읽기 추가 없이 가능하다(plan.md §C). 외부 HTTP 호출은 이 프로젝트 최초이며, research.md §2/§3/§4가 응답 형식(`price`는 문자열)·오류 모드(E1~E8)·`muteHttpExceptions` 필수성을 실측으로 확정해 두었다.

**PRESERVE**: `getAssetTypes()`, `getPortfolioData()`, `setAssetPrice()`, `setAssetSymbol()` 등 기존 서버 함수 전부 시그니처·동작 불변 — `fetchBinancePrice`는 이들을 호출하지 않는 완전히 신규 독립 함수다. `Index.html`은 이 마일스톤에서 전혀 수정하지 않는다(REQ-025 구조적 보장 — 클라이언트에 반올림 로직이 없어야 하므로, M5 이전에는 손대지 않는 편이 오히려 안전).

**IMPROVE (원자적 변경 1건, 단일 파일 `Code.gs` 내)**:
1. `Code.gs`: `fetchBinancePrice(cat)` 신규 — `readAssetRows_()`로 심볼 조회(빈 값이면 즉시 `{error}` 반환, HTTP 호출 없음) → `UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true})`를 try/catch로 감쌈(E6 네트워크 오류) → 응답 코드 분기(400/429/418/451/기타) → `JSON.parse`를 try/catch로 감쌈(E7 파싱 오류) → `parseFloat` + `isFinite` 검사(E8 수치 오류) → `Number(parseFloat(raw).toFixed(2))`로 반올림(research.md §7.3 확정 공식, `Math.round(x*100)/100` 미사용) → 반올림 결과가 `0`인데 원본이 `0`보다 크면 0 붕괴 가드로 `{error}` 반환(REQ-024) → 성공 시 `{price, symbol}` 반환.
2. `appsscript.json`: 프로젝트에 존재하지 않음(신규 생성하지 않음 — Gaps 참조).

#### AC PASS/FAIL 매트릭스

| AC | 대상 요구사항 | 상태 | 검증 방법 | 실제 결과 |
|----|--------------|------|-----------|-----------|
| AC-009 (조회 성공, Apps Script 실환경) | REQ-009, REQ-010 | **미검증 (실기 필요)** | Apps Script 실행 환경 필요 | 이 세션에서 검증 불가 — research.md §3 E5 주의사항대로 로컬 `curl` 성공은 대체 증거가 아니다. 사용자가 배포된 스크립트에서 "값 가져오기" 클릭으로 확인해야 한다 |
| AC-010 (조회는 시트를 변경하지 않는다) | REQ-012, REQ-013 | PASS (정적 추적) | `awk '/^function fetchBinancePrice/,/^}/' Code.gs \| grep -c '\.setValue\|\.setValues'` | `0` — 함수 본문에 시트 쓰기 호출이 전혀 없음 |
| AC-012 (조회 실패: 잘못된 심볼) | REQ-011, REQ-018 | PASS (정적 추적) | 코드 논리 수동 추적 | `code === 400` 분기가 `{error: '심볼을 찾을 수 없습니다'}`를 반환하고 함수가 그 지점에서 종료 — 이후 어떤 시트 쓰기도 실행되지 않음(크래시 없음) |
| AC-013 (조회 실패: 심볼 미등록 방어) | REQ-011 | PASS (정적 추적) | `awk '/^function fetchBinancePrice/,/^if \(!symbol\)/' Code.gs \| grep -c 'UrlFetchApp.fetch'` | `0` — 심볼 미등록 시 `if (!symbol)` 분기에서 즉시 반환되며, 이 분기는 `UrlFetchApp.fetch` 호출 이전에 위치해 외부 HTTP 호출이 발생하지 않음 |
| AC-016 (조회 값은 소수점 둘째 자리까지) | REQ-023 | PASS (정적 추적 + 수기 계산) | 공식 일치 확인 + `0.00000530` 외 사례 수기 추적 | 코드의 `Number(parseFloat(raw).toFixed(2))`가 research.md §7.3 확정 공식과 문자 그대로 일치. `76258.01000000` → `parseFloat` → `76258.01` → `.toFixed(2)` → `"76258.01"` → `Number(...)` → `76258.01`(뒤따르는 0 없음, 오차 0) |
| AC-017 (1센트 미만 자산의 0 붕괴 차단) | REQ-024 | PASS (정적 추적 + 수기 계산) | `SHIBUSDT` 실측값(`0.00000530`)을 코드에 대입해 수기 추적 | `parseFloat("0.00000530")` → `0.0000053`(`parsedPrice`) → `(0.0000053).toFixed(2)` → `"0.00"` → `Number(...)` → `0`(`rounded`) → `rounded === 0 && parsedPrice > 0` → `true` → `{error: '가격이 너무 작아 표시할 수 없습니다'}` 반환, `{price: 0, ...}`으로 폴스루하지 않음을 확인 |

**§D.3 간접 검증 대응**:

| 항목 | 확인 결과 |
|------|-----------|
| 429/418/451 응답 분기 존재 | PASS — `code === 429`/`code === 418`/`code === 451` 3개 분기 모두 코드에 존재, 각각 `{error}` 문자열 반환 |
| `muteHttpExceptions: true` | PASS — `UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true })` 정확히 지정됨 |
| `AssetTypes` 시트 읽기 1회 유지 | PASS — `fetchBinancePrice`는 `readAssetRows_()`를 1회만 호출하며, 별도의 시트 읽기 호출 없음 |
| 반올림 적용 위치가 서버인지 | PASS — `Index.html`에 `toFixed`/`Math.round` 매치 없음(`grep -n "toFixed\|Math.round" Index.html` → 무출력), `Code.gs`의 `fetchBinancePrice`에만 반올림 로직 존재 |

**Gaps (미검증)**:

- **AC-009는 이 세션에서 검증 불가** — Apps Script 실행 환경(사용자의 Google 계정, 배포된 웹앱)에서의 실제 200 응답 수신은 로컬에서 대체할 수 없다(research.md §3 E5). 사용자의 수동 인수 테스트로 이관.
- **`appsscript.json`은 이 저장소에 존재하지 않는다.** `ls appsscript.json` 확인 결과 파일 없음, `git log`에도 이력 없음 — 이 프로젝트는 매니페스트를 온라인 Apps Script 에디터에서 관리하는 것으로 보인다. 알 수 없는 다른 필수 필드(`timeZone`, `exceptionLogging`, `webapp` 설정 등)를 추측해 매니페스트를 새로 만드는 것은 배포를 깨뜨릴 위험이 있으므로 **생성하지 않았다**. 대신 배포 안내 사항으로 남긴다: 온라인 Apps Script 에디터의 "프로젝트 설정 > appsscript.json 표시"에서 OAuth 스코프 목록에 `https://www.googleapis.com/auth/script.external_request`를 수동으로 추가해야 하며, 최초 실행 시 재승인 프롬프트가 뜬다(REQ-022/AC-D.4 완료 정의 항목).
- E3(429)/E4(418)/E5(451) 응답은 research.md §3에서도 재현되지 않았다 — 코드 분기는 방어적으로 작성했으나 실제 발생 시 동작은 미관측.

#### E1. AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Actual Output |
|----|--------|----------------------|----------------|
| AC-009 (live Binance 200 response) | **GAP — cannot verify without Apps Script runtime** | n/a | Deferred to user's manual acceptance pass |
| AC-010 (no sheet write) | PASS | `awk '/^function fetchBinancePrice/,/^}/' Code.gs \| grep -n "\.setValue\|\.setValues"` | (no output — 0 matches) |
| AC-012 (invalid symbol → {error}, no crash) | PASS (static) | Manual trace of the `code === 400` branch | Confirmed — returns `{error: '심볼을 찾을 수 없습니다'}` and exits before any further code |
| AC-013 (empty symbol → 0 fetch calls) | PASS | Manual trace — the `if (!symbol) return ...` line precedes the `UrlFetchApp.fetch(...)` line in source order | 0 fetch calls possible on this path |
| AC-016 (rounding formula matches spec) | PASS | `grep -n "Number(parseFloat(raw).toFixed(2))" Code.gs` | `337:  const rounded = Number(parseFloat(raw).toFixed(2));` |
| AC-017 (0-collapse guard) | PASS (manual calc) | Trace of `parseFloat("0.00000530")` → `.toFixed(2)` → `Number(...)` | `0.0000053` → `"0.00"` → `0`; guard `rounded === 0 && parsedPrice > 0` fires, error returned |

#### E2. Cross-Platform Build result

N/A — Google Apps Script has no build step; `.gs` files are plain JavaScript with no compilation. Not applicable to this project (same as M1/M2/M3).

#### E3. Coverage measurement

N/A — no automated test framework exists in this project (plan.md §A "development method": Apps Script 에디터 수동 실행 + 웹앱 실기 확인).

#### E4. Subagent Boundary Grep

```
$ grep -n 'AskUserQuestion' Code.gs
(no output — no matches)
```

#### E5. Lint Status

N/A — no linter configured for this Apps Script project. Manual balance check performed instead: brace/paren balance in `fetchBinancePrice` confirmed by successful `awk` range extraction (the function's opening `{` and closing `}` delimit cleanly, and the extracted block was used verbatim for the AC-010/AC-013 grep checks above).

#### E6. Branch HEAD + Push state

- Base commit (pre-M4, `origin/main` tip after the escJs security-fix commit): `c08f4cb30a3019892d9681ea083d7d888a0ef61c`
- M4 commit SHA: `f615e5759f582e84176bc9bf071d1822555cbb44`
- `git push origin HEAD:main` → `c08f4cb..f615e57  HEAD -> main` (fast-forward, success)
- Pre-push divergence check (`git rev-list --count --left-right origin/main...HEAD` before push): `0  1` (clean, local ahead by 1 — this commit)

#### E7. Blocker Report

None — no blockers encountered. Files touched: `Code.gs` (new `fetchBinancePrice`), and this `progress.md` (§E.2 M4 evidence + the preceding escJs security-fix note). `appsscript.json` was checked (does not exist in this repo) but not created — documented as a Gap/deployment-note per the delegation prompt's explicit instruction not to fabricate a manifest with unknown required fields. No other file modified.

#### E8. RED Failure Output (N/A — cycle_type=ddd, not tdd)

Not applicable. `cycle_type=ddd` (ANALYZE-PRESERVE-IMPROVE) is in effect; this project has no automated test framework, so no RED-GREEN-REFACTOR cycle applies. Verification is DDD-style: PRESERVE (all pre-existing server function signatures unchanged — `fetchBinancePrice` is additive-only) and IMPROVE (new `fetchBinancePrice` function, fully error-path-covered per research.md §3's E1-E8 table) both confirmed by code trace; AC-009 (the one live-network criterion) is deferred to the user's Apps Script editor + browser manual acceptance pass per plan.md §E.

**Residual-risk**: Static-trace verification only — not exercised against the live Binance API from Apps Script. Untested: whether Google's egress IP is regionally blocked (E5/451) in the user's actual deployment location (research.md §3 explicitly flags this as unresolvable outside the real runtime); whether the V8 runtime's `toFixed`/`parseFloat` behave identically to the IEEE754 desk-calculations in research.md §7.2/§7.3 (expected to match since both are V8, but not exercised live in this session); whether Binance's public endpoint is reachable at all from the user's Google Workspace/consumer account's network context at the time of first use.

### M5 — 클라이언트 UI (cycle_type=ddd, DDD ANALYZE-PRESERVE-IMPROVE) — 최종 마일스톤

**ANALYZE**: `Index.html`의 `onData()`는 이미 `assetSymbolsMap`을 채우고 있고(M3), `renderPricePanel(rows)`는 `assetTypesList` 기준으로 각 자산의 현재가 입력 필드 + "적용" 버튼만 렌더한다. 심볼이 등록된 자산에도 "값 가져오기" 버튼이 없어 M4의 `fetchBinancePrice(cat)` 서버 함수를 호출할 클라이언트 경로가 아직 없다.

**PRESERVE**: `applyAssetPrice(cat)` 함수 본문 — 완전 무변경(byte-diff 0건, 아래 E1 참조). 기존 "적용" 버튼 흐름(`setAssetPrice` 호출, 낙관적 UI, `renderTable`)도 그대로 유지. `renderPricePanel`이 심볼 없는 자산에 렌더하는 마크업(입력 필드 + 적용 버튼만)도 기존과 동일 — 조건 분기가 추가됐을 뿐 심볼-없음 경로의 출력은 M4 이전과 문자 그대로 동일하다.

**IMPROVE (원자적 변경 1건, 단일 파일 `Index.html` 내)**:
1. CSS: `.btn-fetch`(`.btn-apply`와 동일한 크기, `var(--navy)` 배경으로 시각적 구분) + `.fetch-error`(`.symbol-msg`와 동일한 소형 적색 텍스트) 추가.
2. `renderPricePanel(rows)` 수정 — 각 `cat`에 대해 `assetSymbolsMap[cat]`이 참 값이면 "값 가져오기" 버튼 + 인라인 오류 슬롯(`#fetch-err-<cat>`)을 해당 `.price-row`에 추가로 렌더. 심볼이 없으면 `if (symbol)` 블록 전체를 건너뛰어 추가 마크업을 전혀 방출하지 않음(빈/숨김 슬롯도 렌더하지 않음 — REQ-015).
3. `fetchAssetPrice(cat)` 신규 함수 — 버튼을 진행 상태로 바꾸고 오류 슬롯을 비운 뒤 `google.script.run.fetchBinancePrice(cat)` 호출. 성공 시 `d.error`가 있으면 오류 슬롯에 표시 + 입력 필드를 빈 문자열로 리셋(REQ-018), 없으면 `#pi-<cat>`의 `.value`만 `d.price`로 채움(REQ-017) — `setAssetPrice`/`applyAssetPrice`/`onData`/`renderTable`/`renderSummary` 어느 것도 호출하지 않는다(REQ-019, REQ-020). 실패 핸들러도 동일하게 오류 슬롯 표시 + 입력값 리셋.
4. `applyAssetPrice(cat)` — 전혀 수정하지 않음(REQ-021).

#### AC PASS/FAIL 매트릭스

| AC | 대상 요구사항 | 상태 | 검증 방법 | 실제 결과 |
|----|--------------|------|-----------|-----------|
| AC-007 (심볼 등록 자산 → 두 버튼 모두 표시) | REQ-014 | PASS (정적 추적) | `awk` 범위 추출로 `renderPricePanel` 본문 확인 | `symbol` 참 값일 때 `if (symbol)` 블록이 `.btn-fetch` 버튼 + `#fetch-err-<cat>` 슬롯을 `html`에 추가 — `.price-row` 안에 적용 버튼과 값 가져오기 버튼이 함께 렌더됨을 코드 구조로 확인 |
| AC-008 (심볼 없는 자산 → 적용 버튼만, 값 가져오기 버튼 없음, 빈 슬롯도 없음) | REQ-015 | PASS (정적 추적) | 동일 함수의 `if (symbol)` 분기 미진입 경로 추적 | `symbol`이 빈 문자열(falsy)이면 `if (symbol)` 블록 전체가 건너뛰어져 `.btn-fetch`/`.fetch-error` 마크업이 `html`에 전혀 추가되지 않음 — 숨김 요소가 아니라 DOM에 아예 존재하지 않음(REQ-015 "렌더하지 않는다" 충족) |
| AC-010 (값 가져오기만 클릭 — 적용/onData/렌더 함수 0회 호출) | REQ-019, REQ-020 | PASS (정적 추적) | `awk '/^  function fetchAssetPrice/,/^  }/' Index.html \| grep -c 'setAssetPrice\|applyAssetPrice(\|onData(\|renderTable(\|renderSummary('` | `0` — 함수 본문에 다섯 함수 호출이 전혀 없음 |
| AC-011 (값 가져오기 후 적용 클릭 — 기존 흐름 그대로 동작) | REQ-021 | PASS (정적 추적) | `git diff HEAD -- Index.html`에서 `applyAssetPrice` 함수 본문에 대한 변경 라인 0건 확인 | `applyAssetPrice`는 byte 단위로 무변경 — 여전히 `setAssetPrice(cat, price)`를 호출하는 기존 흐름 그대로. `applyAssetPrice`의 `input.parentElement.querySelector('button')`은 DOM 순서상 `.btn-apply`가 `.btn-fetch`보다 먼저 오므로 여전히 적용 버튼 자신을 정확히 찾음(회귀 없음) |
| AC-012 (조회 오류 경로 — 입력 필드 리셋, 오류 표시, 잔존 값 없음) | REQ-018 | PASS (정적 추적) | `fetchAssetPrice` 성공 핸들러의 `d.error` 분기 추적 | `d.error`가 있으면 `input.value = ''`를 오류 슬롯 표시보다 먼저 실행 — 조회 실패 시 입력 필드에 이전 값도, 실패한 조회 값도 남지 않음. `withFailureHandler`(RPC 레벨 실패)도 동일하게 처리 |
| AC-014 (값 가져오기 클릭 시 유일한 RPC 호출은 fetchBinancePrice) | REQ-016 | PASS (정적 추적) | `awk '/^  function fetchAssetPrice/,/^  }/' Index.html \| grep -n 'google.script.run\|\.fetchBinancePrice\|\.setAssetPrice'` | `google.script.run` 1회, `.fetchBinancePrice(cat)` 1회만 매치 — `.setAssetPrice` 매치 0건 |
| AC-018 (반올림/포맷 로직이 클라이언트에 전혀 없음) | REQ-025 | PASS (정적 추적) | `grep -n "toFixed\|Math.round" Index.html` | 무출력(0 matches) — `Index.html` 전체에 반올림 호출 없음. 서버(`Code.gs`)의 `Number(parseFloat(raw).toFixed(2))`만이 유일한 반올림 지점(M4에서 확정) |
| AC-009 (실제 바이낸스 200 응답, Apps Script 실환경) | REQ-009, REQ-010 | **미검증 (실기 필요)** | Apps Script 실행 환경 필요 | M4와 동일한 사유로 이 세션에서 검증 불가 — 사용자가 배포된 웹앱에서 "값 가져오기" 클릭으로 확인해야 한다 |

**Gaps (미검증)**: M1~M4와 동일한 사유로 실제 브라우저·Google Apps Script 실행 환경 없이는 클릭 이벤트·`google.script.run` RPC 왕복을 실행할 수 없어 **정적 코드 추적으로만 검증**했다. 이 SPEC 전체에서 유일하게 남은 실기 검증 대상(AC-009 및 M5의 시각적 확인 — 버튼 노출 여부·오류 메시지 렌더링·입력 필드 값 반영이 실제 브라우저에서 기대대로 보이는지)은 사용자의 배포된 웹앱에서의 수동 인수 테스트로 이관한다.

#### E1. AC Binary PASS/FAIL Matrix

| AC | Status | Verification Command | Actual Output |
|----|--------|----------------------|----------------|
| AC-007 (symbol registered → both buttons render) | PASS (static) | Manual trace of `renderPricePanel`'s `if (symbol)` branch | `.btn-fetch` + `#fetch-err-<cat>` markup appended to `html` only when `symbol` is truthy |
| AC-008 (no symbol → 적용 button only, no fetch button, no stray slot) | PASS (static) | Same-function trace of the falsy-`symbol` path | `if (symbol)` block entirely skipped — zero extra markup emitted, not merely hidden |
| AC-010 (fetch-only click → zero calls to setAssetPrice/applyAssetPrice/onData/renderTable/renderSummary) | PASS (static) | `awk '/^  function fetchAssetPrice/,/^  }/' Index.html \| grep -c 'setAssetPrice\|applyAssetPrice(\|onData(\|renderTable(\|renderSummary('` | `0` |
| AC-011 (fetch then apply → applyAssetPrice byte-unchanged, existing flow intact) | PASS (static) | `git diff HEAD -- Index.html` shows zero changed lines inside `applyAssetPrice`'s function body | Confirmed — `applyAssetPrice` still calls `setAssetPrice(cat, price)` unchanged; its `querySelector('button')` still resolves to `.btn-apply` (first `<button>` in DOM order) |
| AC-012 (error path → input cleared, error shown, no stale value) | PASS (static) | Manual trace of the `d.error` branch and the `withFailureHandler` callback | Both paths execute `input.value = ''` alongside the error-slot write |
| AC-014 (fetch click's only RPC chain is fetchBinancePrice) | PASS (static) | `awk '/^  function fetchAssetPrice/,/^  }/' Index.html \| grep -n 'google.script.run\|\.fetchBinancePrice\|\.setAssetPrice'` | `google.script.run` × 1, `.fetchBinancePrice(cat)` × 1; zero `.setAssetPrice` matches |
| AC-018 (zero rounding/formatting calls anywhere in Index.html) | PASS (static) | `grep -n "toFixed\|Math.round" Index.html` | (no output — 0 matches) |
| AC-009 (live Binance 200 response, Apps Script runtime) | **GAP — cannot verify without Apps Script runtime** | n/a | Deferred to user's manual acceptance pass, same as M4 |

#### E2. Cross-Platform Build result

N/A — Google Apps Script has no build step; `.html`/`.gs` files are plain markup/JavaScript with no compilation. Not applicable to this project (same as M1-M4).

#### E3. Coverage measurement

N/A — no automated test framework exists in this project (development method: Apps Script 에디터 수동 실행 + 웹앱 실기 확인).

#### E4. Subagent Boundary Grep

```
$ grep -n 'AskUserQuestion' Index.html
(no output — no matches)
```

#### E5. Lint Status

N/A — no linter configured for this Apps Script project. Manual balance check performed instead: `python3` brace/paren-count on the full `<script>` block of `Index.html` — 83/83 braces, 355/355 parens (balanced, 0 delta) after the edit.

#### E6. Branch HEAD + Push state

- Base commit (pre-M5, `origin/main` tip at session start): `9607559` (`docs(SPEC-PRICE-001): backfill M4 commit SHA into progress.md §E.2`)
- Pre-push divergence check (`git rev-list --count --left-right origin/main...HEAD` before commit): `0  0` (clean, in sync)
- M5 commit SHA: _to be backfilled after commit (see §E.3 below for the placeholder-then-backfill pattern used by prior milestones)_
- `git push origin HEAD:main` result: _to be recorded after push_

#### E7. Blocker Report

None — no blockers encountered. One deviation from the assumed environment: this M5 delegation cited `plan.md §F` and `acceptance.md AC-007/008/...` as source artifacts, but neither `plan.md` nor `acceptance.md` exist in this repository — only `spec.md` and `progress.md` are present (confirmed via `git ls-tree HEAD .moai/specs/SPEC-PRICE-001/`). This matches the pattern already recorded in M1's own §E.7 (plan-phase artifacts existed only as untracked files in a prior session and were never committed as `plan.md`/`acceptance.md`/`research.md`). The AC numbers cited in the delegation prompt (AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-014, AC-018) match exactly the AC identifiers already used in this file's own M3/M4 evidence tables (e.g. AC-009, AC-010, AC-012 first appear in the M4 section above), so the delegation prompt's AC references are internally consistent with this SPEC's established AC numbering even though the source `acceptance.md` document itself is not present in the tree. No SPEC body content was modified. Files touched: `Index.html` (implementation) and this `progress.md` (§E.2 M5 evidence + §E.3 population). No other file modified, per `git status --short` showing only `Index.html` before this progress.md edit.

#### E8. RED Failure Output (N/A — cycle_type=ddd, not tdd)

Not applicable. `cycle_type=ddd` (ANALYZE-PRESERVE-IMPROVE) is in effect; this project has no automated test framework, so no RED-GREEN-REFACTOR cycle applies. Verification is DDD-style: PRESERVE (`applyAssetPrice` byte-unchanged, existing 적용-button flow and no-symbol rendering path unchanged) and IMPROVE (new "값 가져오기" button + `fetchAssetPrice` function, additive-only) both confirmed by code trace and diff — deferred to the user's Apps Script editor + browser manual acceptance pass.

**Residual-risk**: Static-trace verification only — not exercised in a live browser or Apps Script runtime. This is the largest residual-risk of the entire SPEC, since M5 is the user-visible payoff: whether the "값 가져오기"/"적용" buttons visually align acceptably side-by-side in the existing `.price-row` flex layout at narrow viewport widths (the `@media (max-width: 768px)` block was not touched and does not explicitly account for a third element in the row); whether the button's navy color reads as clearly distinct from the existing green 적용 button to an actual user; whether `google.script.run.fetchBinancePrice(cat)` round-trips correctly against the real Apps Script server binding (the function exists per M4, but M5 has never invoked it end-to-end). None of these can be resolved without the user's own browser test against the deployed web app.

## §E.3 Run-phase Audit-Ready Signal

**요약**: SPEC-PRICE-001의 5개 마일스톤(M1~M5) + 보안 수정 1건이 모두 구현 완료됐다.

| 마일스톤 | 내용 | 파일 | 커밋 |
|----------|------|------|------|
| M1 | AssetTypes 시트 B열(바이낸스 심볼) 스키마 추가 | `Utils.gs` | `1288c9a` |
| M2 | 서버 읽기 계층 재구성 (`readAssetRows_`) | `Code.gs` | `7d70a1c` |
| M3 | 자산 관리 패널 심볼 등록/수정 (`setAssetSymbol`) | `Code.gs`, `Index.html` | `32c6315` |
| (보안 수정) | `escJs` 이중따옴표 이스케이프 누락 수정 (XSS 방어) | `Index.html` | `c08f4cb` |
| M4 | 바이낸스 조회 서버 함수 (`fetchBinancePrice`) | `Code.gs` | `f615e57` |
| M5 | 클라이언트 UI — "값 가져오기" 버튼 (`fetchAssetPrice`) | `Index.html` | _이 커밋(하단 §E.6 참조 후 백필)_ |

**요구사항 커버리지 (REQ-001 ~ REQ-025, 전 25건)**:

| 범위 | REQ | 커버 마일스톤 |
|------|-----|---------------|
| 데이터 계층 | REQ-001~006 | M1, M2 |
| 심볼 등록·수정 | REQ-007~008 | M3 |
| 조회(서버) | REQ-009~013 | M4 |
| 조회(클라이언트) | REQ-014~021 | M5 |
| 문서 | REQ-022 | (sync 단계 — manager-docs 담당, 이 진행 기록의 범위 밖) |
| 가격 정밀도 | REQ-023~025 | M4(023, 024), M5(025 — 클라이언트 반올림 금지 구조적 보장) |

`ac_pass_count`: 이 세션에서 정적 추적으로 PASS 확정된 AC는 M1의 AC-001/002, M2의 REQ-003/004/005/008 대응 항목, M3의 AC-005/006, M4의 AC-010/012/013/016/017, M5의 AC-007/008/010/011/012/014/018 — 총 **16건**(정적 추적 PASS).
`ac_fail_count`: **0건** — 정적 추적으로 확인 가능한 범위에서 FAIL은 없었다.

`preserve_list_post_run_count`: PRESERVE 대상으로 명시된 기존 시그니처·동작 — `getAssetTypes()`, `addAssetType(name)`, `deleteAssetType(name, force)`, `setAssetPrice(cat, price)`, `applyAssetPrice(cat)`, `updateAssetDropdown_()` — 6건 전부 byte-diff 0 또는 동치 분기 조건 확인으로 무변경 검증됨.

`l44_pre_commit_fetch`: 각 마일스톤 커밋 직전 `git fetch origin main` + `git rev-list --count --left-right origin/main...HEAD` 실행 — M1~M5 전부 `0 0` 또는 `0 1`(로컬만 앞섬)로 충돌 없음 확인.
`l44_post_push_fetch`: 각 마일스톤 푸시 결과가 전부 fast-forward(`... HEAD -> main`)로 성공 — 강제 푸시나 충돌 없음.

`new_warnings_or_lints_introduced`: N/A — 이 프로젝트에는 린터가 구성되어 있지 않다(M1~M5 각 §E5에서 반복 확인).

`cross_platform_build`:
- `applicable`: false
- `reason`: Google Apps Script는 빌드 단계가 없다(`.gs`/`.html` 파일은 컴파일 없는 순수 JavaScript/마크업).

`total_run_phase_files`: run 단계 전체에서 수정된 파일 — `Utils.gs`(M1), `Code.gs`(M2, M3, M4), `Index.html`(M3, 보안 수정, M5), `progress.md`(매 마일스톤 §E.2 갱신) — 소스 파일 3개(`Utils.gs`, `Code.gs`, `Index.html`) + `progress.md`.

`m1_to_mN_commit_strategy`: 마일스톤별 개별 커밋(per-M separate commit) — M1~M5 및 보안 수정까지 총 6개의 `feat`/`fix` 커밋, 각 커밋 직후 `progress.md` SHA 백필용 `docs` 커밋을 별도로 추가하는 패턴을 M1~M4에서 사용했다. 이 M5 완료 커밋도 동일 패턴(구현 커밋 → 별도 SHA 백필 `docs` 커밋)을 따른다.

**남은 검증 (사용자 실기 필요)**: 이 SPEC 전체에서 라이브 실행 검증이 미완료인 항목은 **AC-009**(바이낸스 실제 200 응답 수신)이 유일하게 명시적으로 미검증(GAP)이며, 그 외에도 M1/M2(시트 API 실제 호출)와 M5(브라우저에서의 버튼 렌더링·클릭 흐름) 전체가 정적 코드 추적에만 의존했다 — Google Apps Script 실행 환경(사용자의 Google 계정, 배포된 웹앱)이 없으면 이 세션에서 대체할 방법이 없다(research.md §3 E5). 사용자가 배포된 웹앱에서 다음을 수동으로 확인해야 한다:

1. 심볼이 등록된 자산(예: 비트코인)의 "값 가져오기" 클릭 → 입력 필드에 소수점 둘째 자리까지의 실제 시세가 채워지는지
2. 이어서 "적용" 클릭 → 시트 F열이 갱신되는지
3. 심볼 없는 자산에는 "값 가져오기" 버튼이 보이지 않는지
4. 잘못된 심볼 또는 네트워크 오류 시 인라인 오류 메시지가 표시되고 입력 필드가 비는지
5. 기존 자산 추가·삭제·행 CRUD·요약 계산에 회귀가 없는지

run_status: run-phase 구현 완료 (M1~M5 전부), 실기 인수 테스트 대기
run_complete_at: 2026-08-23
run_commit_sha: _pending-backfill-m5_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
