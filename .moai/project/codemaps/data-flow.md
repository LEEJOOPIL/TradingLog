# 주요 데이터 흐름

대표적인 사용자 시나리오 5가지를 진입점부터 최종 반영까지 추적한다.

## 1. 웹앱 최초 로드

```
브라우저가 doGet() URL 접속
  → Code.gs doGet() → HtmlService.createHtmlOutputFromFile('Index')
  → 브라우저에 Index.html 렌더링
  → (Index.html 스크립트 실행) loadData()
  → google.script.run.getPortfolioData()
  → Code.gs getPortfolioData()
      → getDataSheet() [Utils.gs] — TradingLog 시트 조회
      → 시트 A-K열 getValues() 1회 일괄 읽기
      → 행별로 JS 객체 배열(rows) 구성 + 요약(summary) 계산
      → getAssetTypes() [Code.gs] — AssetTypes 시트에서 자산 목록 조회
      → JSON.stringify({ rows, summary, assetTypes }) 반환
  → 클라이언트 onData(json)
      → renderSummary(summary) — 요약 카드 갱신
      → renderTable(rows) — 데이터 테이블 렌더
      → renderAssetManager() — 자산 관리 패널 렌더
      → populateCatSelect() — 모달 드롭다운 갱신
```

## 2. 새 항목 추가 (매입 내역 입력)

```
사용자가 "+ 새 항목" → 모달 입력 → 저장 버튼
  → saveRow() [Index.html]
      → 낙관적 UI: portfolioRows에 buildLocalRow(data) 즉시 추가 → renderTable() 먼저 반영
      → google.script.run.addRow(data)
  → Code.gs addRow(data)
      → getDataSheet() [Utils.gs]
      → getLastDataRow(sheet) [Utils.gs] — B열 일괄 읽기로 마지막 행 판단 (API 1회)
      → writeRowData(sheet, newRow, data) [Code.gs] — A-K 11열 setValues 단일 호출
      → setPriceAndRateFormula(sheet, newRow, data.cat) [PriceFetcher.gs]
          → cat이 이미 전달되었으므로 시트 재조회 없이 바로 수식 설정
          → E열(총매입금액), I열(손절액), G열(수익률) 수식 기록
      → getPortfolioData() [Code.gs] — 최신 전체 데이터 재계산 후 반환
  → 클라이언트 onData(json) — 서버가 계산한 최종 값으로 테이블 재동기화
```

**낙관적 렌더링 포인트**: 사용자는 서버 응답을 기다리지 않고 즉시 결과를 보지만, 서버 응답이 도착하면 (수식으로 계산된 정확한 값으로) 한 번 더 다시 그려진다.

## 3. 시트에서 직접 자산구분(B열) 편집 → 수식 자동 갱신

```
사용자가 Google Sheets에서 B열 셀 값을 드롭다운으로 변경
  → onEdit(e) [Code.gs] 심플 트리거 발동
      → e.range.getSheet().getName() === 'TradingLog' 확인
      → e.range.getColumn() === COL_CAT(2) 확인
      → setPriceAndRateFormula(sheet, row) [PriceFetcher.gs]
          → cat 미전달 → sheet.getRange(row, COL_CAT).getValue()로 재조회
          → E·G·I열 수식 재설정
```

이 경로는 **웹앱을 거치지 않는** 시트 직접 편집 경로다 — `getPortfolioData()`가 호출되지 않으므로, 웹앱이 열려 있어도 자동으로 화면이 갱신되지는 않는다(사용자가 새로고침해야 반영됨).

## 4. 현재가 일괄 설정 (현재가 설정 패널)

```
사용자가 현재가 설정 패널에서 자산별 가격 입력 → "적용"
  → applyPrice(cat, price) [Index.html]
      → 낙관적 UI: 클라이언트 portfolioRows 중 해당 cat 행의 cur/rate를 즉시 재계산 → renderTable()
      → google.script.run.setAssetPrice(cat, price)
  → Code.gs setAssetPrice(cat, price)
      → getDataSheet(), getLastDataRow() [Utils.gs]
      → B열(자산구분) 전체를 1회 읽어 cat과 일치하는 행을 찾아 F열(현재가)에 개별 setValue
      → getPortfolioData() 반환
  → 클라이언트 onData(json) — 서버 계산 값으로 재동기화
```

## 5. 자산 종류 삭제 (사용 중인 자산 보호)

```
사용자가 자산 관리 패널에서 자산 태그의 × 클릭
  → deleteAsset(name) [Index.html]
      → google.script.run.deleteAssetType(name, false)  // force=false
  → Code.gs deleteAssetType(name, false)
      → force !== true → countAssetUsage_(name) [Code.gs] 로 사용 중인 행 수 확인
      → count > 0 이면: { needsConfirm: true, count, assetTypes } 반환 (삭제하지 않음)
  → 클라이언트: needsConfirm === true
      → confirm() 다이얼로그로 재확인
      → 확인 시: google.script.run.deleteAssetType(name, true)  // force=true
  → Code.gs deleteAssetType(name, true)
      → force === true → 사용량 검사 건너뛰고 바로 AssetTypes 시트에서 해당 행 삭제
      → updateAssetDropdown_() [Code.gs] — B열 드롭다운 목록 갱신
      → getPortfolioData() 반환
```

**설계 의도**: 이미 사용 중인 자산을 실수로 삭제하는 것을 막기 위해 2단계 확인 절차(서버가 사용량을 먼저 알려주고, 클라이언트가 재확인받은 뒤 강제 삭제)를 거친다. 삭제해도 기존 행의 자산구분 값 자체는 유지되며, 드롭다운 목록에서만 제거된다(CLAUDE.md에 명시된 정책).
