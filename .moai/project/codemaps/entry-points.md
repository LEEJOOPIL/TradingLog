# 진입점 카탈로그

이 프로젝트에 외부(사용자·Google 플랫폼)에서 코드 실행을 시작시킬 수 있는 지점을 모두 나열한다.

## 1. 웹앱 HTTP 진입점

| 진입점 | 위치 | 트리거 방식 | 반환 |
|--------|------|-------------|------|
| `doGet()` | `Code.gs:57` | 웹앱 URL로 GET 요청 (배포된 웹앱을 브라우저에서 열 때) | `Index.html`을 렌더링한 `HtmlOutput` |

`doGet()`은 파라미터를 받지 않으며, `Index.html`을 통째로 반환한다. 이후의 모든 상호작용은 `google.script.run`을 통한 클라이언트→서버 RPC로 이루어진다.

## 2. Google Sheets 심플 트리거

| 트리거 | 위치 | 발동 조건 | 동작 |
|--------|------|-----------|------|
| `onOpen()` | `Menu.gs:2` | 스프레드시트를 열 때 | "투자 관리" 커스텀 메뉴 등록 (하위 항목: 수식 전체 갱신, 시트 초기화) |
| `onEdit(e)` | `Code.gs:22` | 사용자가 셀을 편집할 때 | TradingLog 시트의 B열(자산구분)이 편집되면 `setPriceAndRateFormula` 호출 — 그 외 열/시트 편집은 무시 |

두 트리거 모두 **심플 트리거**(설치형 트리거 아님)이므로 별도 권한 승인 절차 없이 자동 실행되지만, 그만큼 `SpreadsheetApp.getUi()` 등 일부 API에 제약이 있다(현재 코드는 이 제약에 걸리지 않는 범위 내에서 동작).

## 3. 시트 메뉴 진입점 ("투자 관리" 메뉴)

| 메뉴 항목 | 연결 함수 | 위치 | 설명 |
|-----------|-----------|------|------|
| 📊 수식 전체 갱신 | `updateAllFormulas` | `Code.gs:37` | 전체 행의 E·G·I열 수식을 재설정 |
| 🛠 시트 초기화 | `initSheet` | `Menu.gs:12` | 헤더·서식·드롭다운·요약 수식을 처음부터 재구성 (**기존 데이터 전체 삭제**) |

## 4. 웹앱 클라이언트 → 서버 RPC 진입점 (`google.script.run`)

브라우저에서 사용자 액션에 의해 호출되는 서버 함수들. 모두 `Code.gs`에 정의되어 있다.

| 서버 함수 | 클라이언트 트리거 | 파라미터 |
|-----------|---------------------|----------|
| `getPortfolioData()` | 페이지 최초 로드(`loadData()`), 새로고침 버튼(`refresh()`) | 없음 |
| `setAssetPrice(cat, price)` | 현재가 설정 패널 "적용" 버튼 | 자산구분명, 가격 |
| `addRow(data)` | "+ 새 항목" 모달 저장 (신규) | 행 데이터 객체 |
| `updateRow(sheetRow, data)` | 항목 수정 모달 저장 | 시트 행 번호, 행 데이터 객체 |
| `deleteRow(sheetRow)` | 삭제 버튼 확인 | 시트 행 번호 |
| `getAssetTypes()` | (클라이언트에서 직접 호출하지 않음 — `getPortfolioData`의 응답 필드로 전달) | — |
| `addAssetType(name)` | 자산 관리 패널 "추가" | 자산명 |
| `deleteAssetType(name, force)` | 자산 관리 패널 "삭제" (사용 중이면 재확인 후 `force=true`로 재호출) | 자산명, 강제 삭제 여부 |

## 진입점이 아닌 것 (내부 헬퍼)

다음 함수는 이름 끝의 `_`(밑줄) 관례로 "웹앱/메뉴에서 직접 호출되지 않는 내부 헬퍼"임을 나타낸다 — Apps Script는 이 관례를 강제하지 않지만, 이 프로젝트는 일관되게 지키고 있다.

- `initAssetTypesSheet_()` (Utils.gs)
- `updateAssetDropdown_()` (Code.gs)
- `countAssetUsage_()` (Code.gs)
- `writeRowData()`, `columnToLetter()`도 내부 헬퍼이지만 밑줄 관례를 따르지 않는다 — 명명 일관성 측면에서 참고할 부분.
