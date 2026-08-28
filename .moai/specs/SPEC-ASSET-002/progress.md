# SPEC-ASSET-002 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: "2026-08-28"
tier: M
artifacts: [spec.md, plan.md, acceptance.md]
req_count: 14
ac_count: 15
```

플랜 단계 산출물 3종(spec.md / plan.md / acceptance.md)이 작성 완료됐다. Tier M 예산(REQ 16 / AC 16) 이내다.

## §E.2 Run-phase Evidence

> **검증 방식의 한계 (먼저 밝힌다).** 이 프로젝트는 Google Apps Script 기반이라 로컬 테스트 러너가 없고,
> 구현 환경에서 Apps Script 에디터·브라우저를 실행할 수 없다. 따라서 아래 판정은
> **코드 경로 손추적(trace)과 diff 검토**로 얻은 것이며, **실행 관찰이 아니다.**
> 시트에 실제로 기록된 값을 눈으로 확인한 항목은 하나도 없다 — 이는 §잔여 위험에 그대로 남는다.

### 요구사항별 추적 (REQ-001 ~ REQ-014)

| REQ | 판정 | 구현 위치 | 근거 |
|-----|------|-----------|------|
| REQ-001 | PASS | `Code.gs:330-356` `setSymbol(name, symbol)` | 자산명·심볼을 받아 판별 후 알맞은 열에 기록하는 단일 함수 |
| REQ-002 | PASS | `Code.gs:336` `normalized === 'XAU' \|\| normalized === 'XAG'` → `Code.gs:338` `metalValue` | 완전 일치 시 C열 기록, `Code.gs:337`에서 B열은 `''` |
| REQ-003 | PASS | `Code.gs:337` `binanceValue = (!normalized \|\| isMetal) ? '' : normalized` | 비어 있지 않고 금속이 아니면 B열 기록, `Code.gs:338`에서 C열은 `''` |
| REQ-004 | PASS | `Code.gs:337-338` (`normalized === ''` 경로) | 빈 값이면 `binanceValue=''`, `metalValue=''` — 두 열 모두 비움 |
| REQ-005 | PASS | `Code.gs:332` `.trim().toUpperCase()` | 쓰기 시점 정규화. 기존 저장값에는 소급 적용하지 않음(의도) |
| REQ-006 | PASS | `Code.gs:355` `return JSON.stringify({ error: ... })` | A열 순회에서 못 찾으면 `setValues` 도달 전에 반환 — 시트 미변경 |
| REQ-007 | PASS | `Code.gs:349` `getRange(i+2, 2, 1, 2).setValues([[binanceValue, metalValue]])` | §E.2-3 카운트로 실제 쓰기 호출 1회 확인 |
| REQ-008 | PASS | `setSymbol` 본문 전체 | `updateAssetDropdown_` 호출 없음 (grep 0건), `Code.gs:327-329` 주석에 근거 기록 |
| REQ-009 | PASS | `Index.html:957-960` | 입력 필드 1개 + 저장 버튼 1개 + 메시지 span 1개 |
| REQ-010 | PASS | `Index.html:958` `escAttr(symbol \|\| metalSymbol)` | B열 우선 → 없으면 C열 → 둘 다 없으면 빈 값 |
| REQ-011 | PASS | `Index.html:958` `placeholder="심볼 (예: BTCUSDT, XAU, XAG)"` | 두 형식을 모두 예시로 노출 |
| REQ-012 | PASS | `Index.html:959` `onclick="saveSymbol(...)"` → `Index.html:996` `.setSymbol(name, symbolValue)` → `Index.html:990` `onData(json)` | `onData`가 `renderAssetManager`·`renderPricePanel`을 재호출 |
| REQ-013 | PASS | `git diff` 결과 (아래 §E.2-4) | 조회 경로 4개 함수 모두 diff에 나타나지 않음 |
| REQ-014 | PASS | `CLAUDE.md:69, 88, 111` | 기능 표·심볼 설명 문단·`Code.gs` 함수 목록 갱신 |

### §E.2-2 `setSymbol` 4가지 입력 손추적 (실행 아님 — 코드 경로 추적)

`Code.gs:332` `const normalized  = String(symbol == null ? '' : symbol).trim().toUpperCase();`
`Code.gs:336` `const isMetal      = (normalized === 'XAU' || normalized === 'XAG');`
`Code.gs:337` `const binanceValue = (!normalized || isMetal) ? '' : normalized;`
`Code.gs:338` `const metalValue   = isMetal ? normalized : '';`

| 입력 | `normalized` | `isMetal` | `binanceValue` (B열) | `metalValue` (C열) | 기대 요구사항 |
|------|--------------|-----------|----------------------|--------------------|---------------|
| `'XAU'` | `'XAU'` | `true` | `''` (isMetal → `''`) | `'XAU'` | REQ-002 ✓ |
| `'xau'` | `'XAU'` (`toUpperCase`) | `true` | `''` | `'XAU'` | REQ-002 + REQ-005 ✓ |
| `'BTCUSDT'` | `'BTCUSDT'` | `false` | `'BTCUSDT'` | `''` | REQ-003 ✓ |
| `''` | `''` | `false` | `''` (`!normalized` → `''`) | `''` | REQ-004 ✓ |

부분 일치 반증 추적 — `'XAUUSDT'` → `normalized='XAUUSDT'` → `isMetal=false`(`===` 완전 일치이므로)
→ `binanceValue='XAUUSDT'`, `metalValue=''`. AC-009가 요구하는 대로 B열로 간다.

세 분기 모두 `binanceValue`·`metalValue` 두 값을 함께 계산하므로, "반대쪽 열 비우기"를
빠뜨릴 구조적 여지가 없다(plan.md §C).

### §E.2-3 시트 쓰기 호출 횟수 (REQ-007)

```
$ sed -n '/^function setSymbol/,/^}/p' Code.gs | grep -n 'setValues\|setValue('
19:          // B·C를 setValues 1회로 함께 기록 — 열별 2회 쓰기는 중간 상태를 남긴다(REQ-007)
20:          sheet.getRange(i + 2, 2, 1, 2).setValues([[binanceValue, metalValue]]);
```

19번 줄은 주석, 20번 줄이 유일한 실제 호출 — **실제 쓰기 호출 1회**. `setValue(` 매치 0건.

### §E.2-4 조회 경로 불변 확인 (REQ-013)

```
$ git diff --stat Index.html
 Index.html | 41 +++++------------------------------------
 1 file changed, 5 insertions(+), 36 deletions(-)
```

diff hunk 위치: `@@ -955,13 +955,9 @@`, `@@ -973,8 +969,8 @@`, `@@ -997,34 +993,7 @@` —
전부 자산 관리 패널 영역(955행 이후)이다. 조회 경로 함수 위치는 그보다 앞이며 diff에 없다:

| 함수 | 현재 위치 | diff 포함 여부 |
|------|-----------|----------------|
| `renderPricePanel` ("값 가져오기" 노출 조건 포함) | `Index.html:542-578` (조건은 570행) | 없음 |
| `applyAssetPrice` | `Index.html:580` | 없음 |
| `fetchBinancePriceClient_` | `Index.html:612` | 없음 |
| `fetchGoldApiPriceClient_` | `Index.html:649` | 없음 |
| `fetchAssetPrice` (바이낸스 우선 분기 포함) | `Index.html:674-700` | 없음 |

### §E.2-5 PRESERVE 목록 확인

```
$ git diff --name-only ccb1916..HEAD
CLAUDE.md
Code.gs
Index.html
.moai/specs/SPEC-ASSET-002/*
```

`Utils.gs` / `PriceFetcher.gs` / `Menu.gs` — diff 0건 (파일 자체가 변경 목록에 없음).

`Code.gs` diff는 `setSymbol` 신규 추가(+30행) 단 하나의 hunk이며, `setAssetSymbol`(`Code.gs:282-300`)과
`setMetalSymbol`(`Code.gs:306-324`) 본문은 diff에 나타나지 않는다 — 두 함수는 코드에 그대로 남아 있고
UI 호출만 끊겼다(spec.md §2.5).

```
$ grep -n "setAssetSymbol\|setMetalSymbol" Index.html
(출력 없음)
```

`Index.html`의 `metalSymbolsMap` 전역 변수는 유지됐다(`Index.html:493, 564, 678, 765, 951`) —
REQ-010 초기 표시값과 "값 가져오기" 노출 조건이 아직 이 맵을 읽는다(plan.md §B 이슈 5).

### §E.2-6 인수 기준 대비 판정

| AC | 판정 | 근거 |
|----|------|------|
| AC-001 | PASS (코드 검토) | `Index.html:957-960` 입력/버튼/span 각 1개, `metalsym-` grep 0건 |
| AC-002 | PASS (코드 검토) | `Index.html:958` placeholder |
| AC-003 | PASS (손추적) | §E.2-2 `'BTCUSDT'` 행 |
| AC-004 | PASS (손추적) | §E.2-2 `'XAU'` 행 — `binanceValue=''`가 B열을 덮어쓴다 |
| AC-005 | PASS (손추적) | §E.2-2 `'xau'` 행 |
| AC-006 | PASS (코드 검토) | `Code.gs:332` `.trim()` |
| AC-007 | PASS (손추적) | §E.2-2 `''` 행 + `renderPricePanel:570` 노출 조건이 두 값 모두 빈 값이면 버튼 미출력 |
| AC-008 | PASS (코드 검토) | `Code.gs:355` — 순회 실패 시 `setValues` 도달 전 반환 |
| AC-009 | PASS (손추적) | §E.2-2 `'XAUUSDT'` 반증 추적 |
| AC-010 | PASS (코드 검토) | 배포 코드에 일괄 마이그레이션 로직 없음; `Index.html:958` B열 우선 표시 |
| AC-011 | PASS (손추적) | AC-004와 동일 경로 |
| AC-012 | **미검증 (Gap)** | 브라우저 실행 불가 — 조회 경로 코드 불변만 확인(§E.2-4) |
| AC-013 | **미검증 (Gap)** | 동일 |
| AC-014 | **미검증 (Gap)** | 자산 CRUD 실기 확인 불가. `setSymbol`이 `updateAssetDropdown_`을 호출하지 않는다는 점만 코드로 확인 |
| AC-015 | PASS | `CLAUDE.md:69, 88, 111` |

**미해소 3건(AC-012·AC-013·AC-014)은 Apps Script 새 버전 재배포 후 사용자 실기 확인이 필요하다.**
셋 다 이 SPEC이 코드를 건드리지 않은 영역(조회 경로·자산 CRUD)의 회귀 확인 항목이다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: "2026-08-28"
run_commit_shas: ["1382210", "39b62b2", "2e2baf6"]
run_status: PASS-WITH-DEBT
verification_method: trace-and-diff-only
ac_pass_count: 12
ac_fail_count: 0
ac_ungated_count: 3          # AC-012, AC-013, AC-014 — 실기 확인 필요
req_pass_count: 14
preserve_list_post_run_count: 3   # Utils.gs / PriceFetcher.gs / Menu.gs — diff 0건
new_warnings_or_lints_introduced: 0
sheet_write_calls_in_setSymbol: 1
total_run_phase_files: 3      # Code.gs, Index.html, CLAUDE.md
m1_to_mN_commit_strategy: per-milestone
deployment_required: true     # Apps Script 새 버전 재배포 후에야 실기 확인 가능
```

**PASS-WITH-DEBT 사유**: 요구사항 14개와 코드 검토 가능한 인수 기준 12개는 모두 통과했으나,
브라우저·Apps Script 실행이 불가능한 환경이라 실기 회귀 3건(AC-012·AC-013·AC-014)이 미검증으로 남는다.
이는 구현 결함이 아니라 검증 수단의 부재이며, 재배포 후 사용자 확인으로 해소된다.

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
