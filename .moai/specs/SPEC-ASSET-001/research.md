# Research: SPEC-ASSET-001 — 자산 종류 동적 관리

## 분석 요약

현재 자산 종류(자산구분)는 코드 전체에 하드코딩되어 있다. 새 자산을 추가하려면 개발자가 직접 코드를 수정해야 한다. 이 SPEC은 자산 목록을 별도 시트에 저장하고 웹앱에서 동적으로 관리하는 기능을 추가한다.

---

## 하드코딩 위치 분석

### 1. Menu.gs — initSheet() (라인 57)

```javascript
const validation = SpreadsheetApp.newDataValidation()
  .requireValueInList(['금', '은', '비트코인', '이더리움', '솔라나', 'USDT', 'USDC'], true)
  .setAllowInvalid(false)
  .build();
sheet.getRange(DATA_START, COL_CAT, 998).setDataValidation(validation);
```

**영향**: 시트 초기화 시 드롭다운이 고정 7개로만 설정됨. 이 부분을 동적으로 변경해야 한다.

### 2. Index.html — 모달 select (라인 389-397)

```html
<select id="f-cat">
  <option value="">선택...</option>
  <option>금</option>
  <option>은</option>
  <option>비트코인</option>
  <option>이더리움</option>
  <option>솔라나</option>
  <option>USDT</option>
  <option>USDC</option>
</select>
```

**영향**: 새 자산이 추가돼도 모달 드롭다운에 나타나지 않음.

### 3. Index.html — renderPricePanel() (라인 470-498)

현재 현재가 설정 패널은 `portfolioRows`에서 실제로 존재하는 자산만 표시한다. 아직 매입 기록이 없는 새 자산은 패널에 나타나지 않는다.

---

## 데이터 흐름 분석

### getPortfolioData()

- TradingLog 시트에서 데이터를 읽어 `{ rows, summary }` JSON 반환
- 웹앱이 이 데이터로 테이블, 요약 카드, 현재가 패널을 렌더링
- **변경 필요**: 응답에 `assetTypes` 배열 추가

### setAssetPrice(cat, price)

- `String(row[0]).trim() === String(cat).trim()` 로 자산명 매칭
- 이미 동적 매칭 방식이므로 변경 없이 새 자산도 처리 가능

### addRow / updateRow

- `data.cat`에 어떤 값이든 기록 가능 (유효성은 스프레드시트 드롭다운에서만 체크)
- 변경 불필요

---

## 신규 AssetTypes 시트 설계

| 행 | A열 |
|----|-----|
| 1  | 자산명 (헤더) |
| 2  | 금 |
| 3  | 은 |
| 4  | 비트코인 |
| 5  | 이더리움 |
| 6  | 솔라나 |
| 7  | USDT |
| 8  | USDC |
| 9+ | (사용자 추가) |

- 시트명: `AssetTypes`
- A1: 헤더 ("자산명")
- A2~: 자산 이름 목록

---

## 신규 함수 설계

### getAssetTypes() — Utils.gs 또는 Code.gs 추가

```javascript
function getAssetTypes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('AssetTypes');
  if (!sheet) {
    sheet = initAssetTypesSheet_();
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(r => String(r[0]).trim())
    .filter(v => v !== '');
}
```

### addAssetType(name) — Code.gs 추가

- AssetTypes 시트에 이름 추가
- TradingLog 시트 B열 드롭다운 갱신
- 중복 체크 포함

### deleteAssetType(name) — Code.gs 추가

- TradingLog 시트에서 해당 자산 사용 여부 확인
- 사용 중이면 `{ warning: true, count: N }` 반환 → 웹앱에서 confirm 처리
- 강제 삭제 파라미터 `force=true`로 재호출 시 삭제 실행
- AssetTypes 시트에서 해당 행 삭제
- TradingLog 드롭다운 갱신

### updateDropdownValidation_() — 내부 헬퍼

- AssetTypes 목록을 읽어 TradingLog 시트 B열 드롭다운 업데이트

### getPortfolioData() — 수정

- 응답에 `assetTypes` 배열 추가: `{ rows, summary, assetTypes }`

---

## 웹앱 UI 변경 설계

### 자산 관리 패널 (신규)

현재가 설정 패널 위에 추가:

```
┌─ 자산 관리 ──────────────────────────────────┐
│  [금] [은] [비트코인] [이더리움] [솔라나] ...  │
│  각 항목 우측에 × 삭제 버튼                    │
│  ──────────────────────────────────────       │
│  [입력 필드: 새 자산명] [＋ 추가]              │
└──────────────────────────────────────────────┘
```

### 모달 자산구분 드롭다운

- 페이지 로드 시 `getPortfolioData()` 응답의 `assetTypes` 배열로 `<option>` 동적 생성

### 현재가 설정 패널 변경

- 기존: `portfolioRows`에서 보이는 자산만 표시
- 변경: `assetTypes` 목록의 모든 자산 표시 (매입 행 없어도 표시)

---

## 위험 및 제약

| 위험 | 영향 | 대응 |
|------|------|------|
| 자산 삭제 후 기존 행이 드롭다운 목록에 없는 값 | B열 드롭다운 유효성 오류 표시 | 경고 후 삭제 허용, setAllowInvalid(true) 고려 |
| AssetTypes 시트 직접 수정 | 드롭다운 미갱신 | 사용자 교육 또는 onEdit 트리거 확장 |
| 자산명에 특수문자/공백 | 드롭다운 오작동 | addAssetType에서 trim + 빈값 거부 검증 |
| 빈 AssetTypes 시트 | 드롭다운 비어있음 | 비어있을 때 기본 7개 자동 복구 옵션 |

---

## 참조 구현

- `getLastDataRow()` (Utils.gs:10): B열 배치 읽기 패턴 → `getAssetTypes()`도 동일 패턴 적용
- `writeRowData()` (Code.gs:127): setValues 단일 호출 패턴
- `renderPricePanel()` (Index.html:470): 자산별 UI 렌더링 패턴 참조
