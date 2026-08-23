# 의존성 그래프

## 파일 단위 의존 방향

```
Index.html (클라이언트)
      │ google.script.run (RPC — 컴파일 타임 검증 없음)
      ▼
Code.gs ──────────┐
      │            │
      ▼            ▼
Menu.gs      PriceFetcher.gs
      │            │
      └─────┬──────┘
            ▼
        Utils.gs
```

- `Utils.gs`는 다른 어떤 `.gs` 파일도 호출하지 않는다 — 가장 아래 계층.
- `PriceFetcher.gs`는 `Utils.gs`가 정의한 상수(`COL_*`)만 참조하고, 함수 호출 의존은 없다.
- `Code.gs`와 `Menu.gs`는 `Utils.gs`와 `PriceFetcher.gs`를 호출하지만, 서로를 호출하지는 않는다.
- **순환 의존 없음.**

## 함수 호출 그래프 (서버 사이드)

```mermaid
graph TD
    subgraph "Code.gs"
        onEdit
        updateAllFormulas
        doGet
        getPortfolioData
        writeRowData
        addRow
        updateRow
        deleteRow
        setAssetPrice
        getAssetTypes
        addAssetType
        deleteAssetType
        updateAssetDropdown_
        countAssetUsage_
    end
    subgraph "Menu.gs"
        onOpen
        initSheet
    end
    subgraph "PriceFetcher.gs"
        setPriceAndRateFormula
        columnToLetter
    end
    subgraph "Utils.gs"
        getDataSheet
        getLastDataRow
        initAssetTypesSheet_
    end

    onEdit --> setPriceAndRateFormula
    updateAllFormulas --> getDataSheet
    updateAllFormulas --> getLastDataRow
    updateAllFormulas --> setPriceAndRateFormula

    getPortfolioData --> getDataSheet
    getPortfolioData --> getAssetTypes

    addRow --> getDataSheet
    addRow --> getLastDataRow
    addRow --> writeRowData
    addRow --> setPriceAndRateFormula
    addRow --> getPortfolioData

    updateRow --> getDataSheet
    updateRow --> writeRowData
    updateRow --> setPriceAndRateFormula
    updateRow --> getPortfolioData

    deleteRow --> getDataSheet
    deleteRow --> getPortfolioData

    setAssetPrice --> getDataSheet
    setAssetPrice --> getLastDataRow
    setAssetPrice --> getPortfolioData

    getAssetTypes --> initAssetTypesSheet_

    addAssetType --> getAssetTypes
    addAssetType --> initAssetTypesSheet_
    addAssetType --> updateAssetDropdown_
    addAssetType --> getPortfolioData

    deleteAssetType --> countAssetUsage_
    deleteAssetType --> getAssetTypes
    deleteAssetType --> updateAssetDropdown_
    deleteAssetType --> getPortfolioData

    updateAssetDropdown_ --> getAssetTypes
    updateAssetDropdown_ --> getDataSheet

    countAssetUsage_ --> getDataSheet
    countAssetUsage_ --> getLastDataRow

    onOpen -.registers menu.-> updateAllFormulas
    onOpen -.registers menu.-> initSheet

    initSheet --> initAssetTypesSheet_
    initSheet --> updateAssetDropdown_
    initSheet --> columnToLetter

    setPriceAndRateFormula --> columnToLetter
```

## 클라이언트 → 서버 호출 그래프 (`google.script.run`)

```mermaid
graph LR
    subgraph "Index.html (브라우저)"
        loadData
        refresh
        applyPrice["현재가 적용 핸들러"]
        saveRow
        confirmDelete
        addAsset
        deleteAsset
    end
    subgraph "Code.gs (서버)"
        getPortfolioData2["getPortfolioData"]
        setAssetPrice2["setAssetPrice"]
        addRow2["addRow"]
        updateRow2["updateRow"]
        deleteRow2["deleteRow"]
        addAssetType2["addAssetType"]
        deleteAssetType2["deleteAssetType"]
    end

    loadData -->|RPC| getPortfolioData2
    refresh -->|RPC| getPortfolioData2
    applyPrice -->|RPC| setAssetPrice2
    saveRow -->|RPC 신규| addRow2
    saveRow -->|RPC 수정| updateRow2
    confirmDelete -->|RPC| deleteRow2
    addAsset -->|RPC| addAssetType2
    deleteAsset -->|RPC| deleteAssetType2
```

## 고팬인(fan-in) 함수 — 변경 시 영향 범위가 넓은 함수

| 함수 | fan-in | 호출하는 곳 |
|------|--------|--------------|
| `getAssetTypes()` | 4 | `addAssetType`, `deleteAssetType`, `getPortfolioData`, `updateAssetDropdown_` |
| `updateAssetDropdown_()` | 3 | `addAssetType`, `deleteAssetType`, `initSheet` |
| `getDataSheet()` | 6 | `updateAllFormulas`, `getPortfolioData`, `addRow`, `updateRow`, `deleteRow`, `setAssetPrice`, `updateAssetDropdown_`, `countAssetUsage_` (Utils.gs 정의, 서버 함수 대부분이 의존) |
| `getPortfolioData()` | 6 | `addRow`, `updateRow`, `deleteRow`, `setAssetPrice`, `addAssetType`, `deleteAssetType` 반환값으로 사용, 클라이언트의 `loadData`/`refresh`가 직접 RPC 호출 |

이 표에 있는 함수의 시그니처(파라미터·반환 형식)를 바꾸면, 나열된 모든 호출부를 함께 점검해야 한다.

## 서드파티/외부 의존성

없음. Apps Script 내장 서비스(`SpreadsheetApp`, `HtmlService`)만 사용하며, `package.json`이나 외부 라이브러리가 없다.
