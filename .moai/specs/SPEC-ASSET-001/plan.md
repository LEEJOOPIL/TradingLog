# Plan: SPEC-ASSET-001 — 자산 종류 동적 관리

## 구현 전략

브라운필드 프로젝트. 기존 코드를 최소한으로 수정하고 신규 함수를 추가하는 방식으로 진행한다.

---

## [DELTA] 변경 파일 요약

### Code.gs
- [MODIFY] 상수 추가: `ASSET_SHEET_NAME`
- [MODIFY] `getPortfolioData()`: 응답에 `assetTypes` 추가
- [NEW] `getAssetTypes()`: AssetTypes 시트에서 목록 반환
- [NEW] `addAssetType(name)`: 자산 추가 + 드롭다운 갱신
- [NEW] `deleteAssetType(name, force)`: 자산 삭제 (사용 여부 체크 포함)
- [NEW] `updateAssetDropdown_()`: B열 드롭다운 갱신 내부 헬퍼

### Menu.gs
- [MODIFY] `initSheet()`: 자산구분 드롭다운 설정을 하드코딩 대신 `updateAssetDropdown_()` 호출로 변경
- [MODIFY] `initSheet()`: `initAssetTypesSheet_()` 호출 추가

### Utils.gs
- [NEW] `initAssetTypesSheet_()`: AssetTypes 시트 생성 및 기본값 삽입

### Index.html
- [MODIFY] 모달 `<select id="f-cat">`: 하드코딩 `<option>` 제거, JS로 동적 생성
- [NEW] 자산 관리 패널 HTML: 현재가 패널 위에 추가
- [MODIFY] `renderPricePanel(rows)`: `rows` 대신 `assetTypesList` 기반으로 렌더링
- [MODIFY] `onData(json)`: `assetTypes` 파싱 및 전역 저장, 드롭다운 갱신
- [NEW] `renderAssetManager()`: 자산 관리 패널 렌더링
- [NEW] `addAsset()`: 추가 버튼 핸들러
- [NEW] `deleteAsset(name)`: 삭제 버튼 핸들러 (경고 처리 포함)

---

## 태스크 분해

### Task 1: Code.gs — 상수 및 신규 함수 추가

**파일**: `Code.gs`

1. 상수 추가 (최상단):
```javascript
const ASSET_SHEET_NAME = 'AssetTypes';
const DEFAULT_ASSETS   = ['금', '은', '비트코인', '이더리움', '솔라나', 'USDT', 'USDC'];
```

2. `getAssetTypes()` 추가:
   - `SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ASSET_SHEET_NAME)` 조회
   - 없으면 `initAssetTypesSheet_()` 호출
   - A2~ 값을 배열로 반환 (빈 값 필터링)

3. `addAssetType(name)` 추가:
   - `name.trim()` 검증 (빈 값 거부)
   - 기존 목록에서 중복 체크 (대소문자 무시)
   - 시트 마지막 행에 `appendRow([name.trim()])`
   - `updateAssetDropdown_()` 호출
   - `getPortfolioData()` 반환

4. `deleteAssetType(name, force)` 추가:
   - `force !== true` 이면 TradingLog 시트에서 해당 자산 사용 행 카운트
   - 사용 중이고 force 아니면 `{ needsConfirm: true, count: N, assetTypes: [...] }` 반환
   - AssetTypes 시트에서 해당 이름 행 찾아 `deleteRow()`
   - `updateAssetDropdown_()` 호출
   - `getPortfolioData()` 반환

5. `updateAssetDropdown_()` 추가:
   - `getAssetTypes()` 호출
   - 목록이 비어있으면 `DEFAULT_ASSETS` 사용
   - `requireValueInList(assets, true).setAllowInvalid(true).build()` — 기존 데이터 보호
   - TradingLog 시트 B열(DATA_START~998) `setDataValidation()` 호출

6. `getPortfolioData()` 수정:
   - 기존 `return JSON.stringify({ rows, summary })` →
   - `return JSON.stringify({ rows, summary, assetTypes: getAssetTypes() })`

---

### Task 2: Utils.gs — initAssetTypesSheet_() 추가

**파일**: `Utils.gs`

```javascript
function initAssetTypesSheet_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(ASSET_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ASSET_SHEET_NAME);
  if (sheet.getLastRow() >= 2) return sheet; // 데이터 있으면 유지
  sheet.getRange(1, 1).setValue('자산명').setFontWeight('bold');
  const data = DEFAULT_ASSETS.map(n => [n]);
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  return sheet;
}
```

---

### Task 3: Menu.gs — initSheet() 수정

**파일**: `Menu.gs`

- `initAssetTypesSheet_()` 호출 추가 (initSheet 시작 부분)
- 기존 하드코딩 드롭다운 설정 블록 → `updateAssetDropdown_()` 호출로 대체:

```javascript
// 기존 제거:
// const validation = SpreadsheetApp.newDataValidation()
//   .requireValueInList(['금', '은', ...], true)...

// 대체:
initAssetTypesSheet_();
updateAssetDropdown_();
```

---

### Task 4: Index.html — 자산 관리 패널 HTML 추가

`<div class="price-panel">` 바로 위에 추가:

```html
<div class="price-panel" id="assetMgrPanel">
  <div class="price-panel-head">
    <h2>자산 관리</h2>
    <span class="hint">자산 종류 추가 · 삭제</span>
  </div>
  <div class="price-panel-body" id="assetMgrBody">
    <span style="color:var(--muted);font-size:0.85rem;">로딩 중...</span>
  </div>
</div>
```

---

### Task 5: Index.html — JS 수정

1. 전역 변수 추가:
```javascript
var assetTypesList = [];
```

2. `onData(json)` 수정:
```javascript
function onData(json) {
  var d = JSON.parse(json);
  assetTypesList = d.assetTypes || [];
  renderSummary(d.summary);
  renderTable(d.rows);
  renderAssetManager();
  populateCatSelect();
  setUpdated();
}
```

3. `renderPricePanel(rows)` 수정:
   - `seen` 생성 시 `assetTypesList` 기반으로 초기화 후 `rows`에서 현재가 값만 채움
   - 매입 행 없는 자산도 패널에 표시

4. `renderAssetManager()` 신규:
   - `assetTypesList`를 순회해 태그+삭제 버튼 HTML 생성
   - 하단에 추가 입력 필드 + 추가 버튼

5. `populateCatSelect()` 신규:
   - `#f-cat` select의 기존 option 제거 후 `assetTypesList`로 재생성

6. `addAsset()` 신규:
   - 입력값 trim 검증
   - `google.script.run.addAssetType(name)` 호출
   - 성공 핸들러: `onData(json)` 호출

7. `deleteAsset(name)` 신규:
   - `google.script.run.deleteAssetType(name, false)` 호출
   - 성공 핸들러:
     - `needsConfirm === true` 이면 confirm 다이얼로그 표시
     - 확인 시 `deleteAssetType(name, true)` 재호출
     - 아니면 `onData(json)` 처리

---

## 기술 의존성 및 순서

```
Task 2 (Utils.gs: initAssetTypesSheet_)
  ↓
Task 1 (Code.gs: 신규 함수들 — initAssetTypesSheet_ 참조)
  ↓
Task 3 (Menu.gs: initSheet — updateAssetDropdown_ 참조)
  ↓
Tasks 4, 5 (Index.html — assetTypes 응답 형식 의존)
```

Tasks 4와 5는 병렬 작업 가능.

---

## 성능 고려사항

- `getAssetTypes()`: 시트 1회 읽기 (getValues 1회)
- `addAssetType/deleteAssetType`: 드롭다운 갱신 1회 (setDataValidation 1회)
- `getPortfolioData()`: `getAssetTypes()` 추가 호출 1회 — 기존 흐름과 동일 세션에서 실행되므로 캐싱 불필요
- 프론트엔드 `assetTypesList`: 전역 캐시로 매 렌더링마다 서버 호출 없이 재사용

---

## 라이브러리 버전

신규 외부 의존성 없음. 기존 Google Apps Script API만 사용.

---

## 리스크

| 리스크 | 완화 방안 |
|--------|-----------|
| 자산 삭제 후 기존 행 드롭다운 오류 표시 | `setAllowInvalid(true)` 사용으로 기존 값 유지 |
| `initAssetTypesSheet_` 동시 호출 | 시트 존재 시 early return으로 안전 |
| `getPortfolioData` 응답 크기 증가 | 자산 수 최대 수십 개 수준 — 무시할 수준 |
