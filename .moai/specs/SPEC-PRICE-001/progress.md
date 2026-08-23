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

Recorded after commit — see Git commit SHA below (this section is updated post-commit as part of the same run-phase evidence entry).

#### E7. Blocker Report

None — no blockers encountered. One deviation from the assumed environment: SPEC-PRICE-001's plan-phase artifacts (`spec.md`/`plan.md`/`acceptance.md`/`research.md`/`progress.md`) exist only as **untracked** files in the main checkout (`git status` showed `?? .moai/specs/SPEC-PRICE-001/`), not as a prior committed plan-phase commit. Since this run-phase work executes inside an isolated git worktree (`.claude/worktrees/agent-a0f9eafb4dc8a4275/`) that does not receive untracked files from the main checkout, `spec.md` and `progress.md` were copied into the worktree to be edited and committed as part of this M1 commit — `plan.md`/`acceptance.md`/`research.md` were left untouched/uncommitted per this milestone's scope discipline (B10: touch only `Utils.gs`, `Menu.gs`, and `spec.md` frontmatter).

#### E8. RED Failure Output (N/A — cycle_type=ddd, not tdd)

Not applicable. `cycle_type=ddd` (ANALYZE-PRESERVE-IMPROVE) is in effect per the delegation prompt; this project has no automated test framework, so no RED-GREEN-REFACTOR cycle applies. Verification is DDD-style: PRESERVE (existing behavior unchanged) confirmed by code trace, IMPROVE (new behavior) confirmed by code trace — both deferred to the user's Apps Script editor manual acceptance pass per plan.md §E.

**Residual-risk**: The static-trace verification is logically sound but has not been exercised against the live Google Sheets API. Edge cases not covered by static trace: (a) Google Sheets API behavior when `setValues` receives a 2-column array where some cells are empty strings (expected: writes empty string, not null — assumed based on Apps Script `Range.setValues` documented behavior, not independently verified here); (b) concurrent `initSheet()` invocations (out of scope — Apps Script script execution is inherently single-threaded per script).

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
