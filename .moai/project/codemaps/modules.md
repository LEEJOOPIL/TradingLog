# 모듈(파일) 카탈로그

Apps Script에는 패키지 개념이 없으므로, 여기서는 파일 하나를 "모듈" 단위로 취급한다. 각 함수의 시그니처·책임·호출 관계를 정리한다.

---

## Code.gs — 핵심 로직 (Entry / CRUD)

**책임**: 전역 상수 정의, 웹앱 HTTP 진입점, `onEdit` 트리거, 포트폴리오 행 CRUD, 자산구분 CRUD.

### 상수 (전체 파일에서 공유)

`SHEET_NAME`, `ASSET_SHEET_NAME`, `DEFAULT_ASSETS`(7종), `DATA_START`(2), `COL_DATE`~`COL_REASON`(A~K 열 번호), `SUM_LABEL_COL`/`SUM_VAL_COL`(M/N), `SUM_START_ROW`(3).

### 함수

| 함수 | 시그니처 | 책임 | 호출하는 함수 |
|------|----------|------|----------------|
| `onEdit` | `onEdit(e)` | 심플 트리거 — B열(자산구분) 편집 시 수식 자동 설정 | `setPriceAndRateFormula` |
| `updateAllFormulas` | `updateAllFormulas()` | 메뉴 실행 — 전체 행 수식 재설정 | `getDataSheet`, `getLastDataRow`, `setPriceAndRateFormula` |
| `doGet` | `doGet()` | 웹앱 HTTP 진입점 — Index.html 반환 | (없음) |
| `getPortfolioData` | `getPortfolioData()` | 전체 행 + 요약 계산 후 JSON 반환 (웹앱용) | `getDataSheet`, `getAssetTypes` |
| `writeRowData` | `writeRowData(sheet, row, data)` | A-K 11열을 단일 `setValues` 호출로 일괄 기록 | (없음) |
| `addRow` | `addRow(data)` | 행 추가 | `getDataSheet`, `getLastDataRow`, `writeRowData`, `setPriceAndRateFormula`, `getPortfolioData` |
| `updateRow` | `updateRow(sheetRow, data)` | 행 수정 | `getDataSheet`, `writeRowData`, `setPriceAndRateFormula`, `getPortfolioData` |
| `deleteRow` | `deleteRow(sheetRow)` | 행 삭제 | `getDataSheet`, `getPortfolioData` |
| `setAssetPrice` | `setAssetPrice(cat, price)` | 자산구분별 현재가 일괄 반영 | `getDataSheet`, `getLastDataRow`, `getPortfolioData` |
| `getAssetTypes` | `getAssetTypes()` | AssetTypes 시트에서 자산 목록 반환. **`@MX:ANCHOR` fan_in=4** | `initAssetTypesSheet_` (시트 없을 때만) |
| `addAssetType` | `addAssetType(name)` | 자산 추가 (중복 검사 포함) | `getAssetTypes`, `initAssetTypesSheet_`, `updateAssetDropdown_`, `getPortfolioData` |
| `deleteAssetType` | `deleteAssetType(name, force)` | 자산 삭제 (사용 중이면 확인 요청) | `countAssetUsage_`, `getAssetTypes`, `updateAssetDropdown_`, `getPortfolioData` |
| `updateAssetDropdown_` | `updateAssetDropdown_()` | B열 998행 드롭다운 목록 일괄 갱신. **`@MX:ANCHOR` fan_in=3** | `getAssetTypes`, `getDataSheet` |
| `countAssetUsage_` | `countAssetUsage_(name)` | 특정 자산을 쓰는 행 개수 카운트 (내부 헬퍼) | `getDataSheet`, `getLastDataRow` |

---

## Menu.gs — 메뉴 등록 및 시트 초기화 (Entry)

**책임**: 커스텀 메뉴("투자 관리") 등록, 시트 헤더·서식·수식·조건부 서식 초기화.

| 함수 | 시그니처 | 책임 | 호출하는 함수 |
|------|----------|------|----------------|
| `onOpen` | `onOpen()` | 심플 트리거 — 스프레드시트 열릴 때 커스텀 메뉴 등록 (updateAllFormulas / initSheet 연결) | (없음, 메뉴 등록만) |
| `initSheet` | `initSheet()` | 헤더·열너비·드롭다운·체크박스·조건부서식·요약 수식 전체 세팅 (데이터 전체 삭제 후 재구성) | `initAssetTypesSheet_`, `updateAssetDropdown_`, `columnToLetter` |

---

## PriceFetcher.gs — 수식 설정 (Business / Formula)

**책임**: 행 단위로 총매입금액·수익률·손절액 수식을 설정. `cat` 파라미터를 전달받으면 시트 재조회를 생략해 쓰기 버퍼 플러시를 방지한다.

| 함수 | 시그니처 | 책임 | 호출하는 함수 |
|------|----------|------|----------------|
| `setPriceAndRateFormula` | `setPriceAndRateFormula(sheet, row, cat)` | 총매입금액(E)·수익률(G)·손절액(I) 수식 설정 | `columnToLetter` (자기 파일 내) |
| `columnToLetter` | `columnToLetter(col)` | 열 번호 → 열 문자 변환 (1→A, 2→B …) | (없음) |

---

## Utils.gs — 공통 유틸 (Infrastructure)

**책임**: 시트 조회 헬퍼, AssetTypes 시트 초기화.

| 함수 | 시그니처 | 책임 | 호출하는 함수 |
|------|----------|------|----------------|
| `getDataSheet` | `getDataSheet()` | TradingLog 시트 반환 (없으면 에러) | (없음) |
| `getLastDataRow` | `getLastDataRow(sheet)` | B열 일괄 읽기로 마지막 데이터 행 반환 (API 호출 1회) | (없음) |
| `initAssetTypesSheet_` | `initAssetTypesSheet_()` | AssetTypes 시트 생성 + 기본 7종 자산 삽입 (기존 데이터 있으면 유지) | (없음) |

---

## Index.html — 웹앱 UI (Presentation)

**책임**: 요약 카드, 자산 관리 패널, 현재가 설정 패널, 데이터 테이블, 입력 모달을 렌더링하고 사용자 액션을 서버 함수 호출로 연결한다.

### 주요 클라이언트 함수

| 함수 | 책임 | 호출하는 서버 함수 (`google.script.run`) |
|------|------|---------------------------------------------|
| `loadData()` | 페이지 로드 시 최초 데이터 로드 | `getPortfolioData` |
| `refresh()` | 새로고침 버튼 | `getPortfolioData` |
| (현재가 적용 핸들러) | 현재가 설정 패널 "적용" 클릭 | `setAssetPrice(cat, price)` |
| `saveRow()` | 모달 저장 (낙관적 UI 먼저 반영) | 신규: `addRow(data)` / 수정: `updateRow(sheetRow, data)` |
| `confirmDelete(idx)` | 행 삭제 (낙관적 UI 먼저 반영) | `deleteRow(sheetRow)` |
| `addAsset()` | 자산 관리 패널 "추가" | `addAssetType(name)` |
| `deleteAsset(name)` | 자산 관리 패널 "삭제" (사용 중이면 재확인 후 강제 삭제) | `deleteAssetType(name, false)` → 확인 시 `deleteAssetType(name, true)` |
| `onData(json)` | 서버 응답을 파싱해 요약·테이블·자산 목록 재렌더 | (서버 호출 없음 — 콜백) |

이 파일은 서버 함수를 **직접 참조하지 않고** `google.script.run.<함수명>()` 형태로만 호출한다 — 컴파일 타임에 연결이 검증되지 않으므로, 서버 함수명이 바뀌면 이 파일의 호출부도 함께 수정해야 한다.
