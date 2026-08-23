# 아키텍처 개요

## 한눈에 보기

TradingLog는 **Google Apps Script 단일 프로젝트** 구조다. 별도 패키지·모듈 시스템 없이, 5개 파일이 Apps Script 전역 네임스페이스를 공유하는 **레이어드(계층형) 구조**로 동작한다.

```
┌─────────────────────────────────────────────┐
│  클라이언트 계층 (Presentation)               │
│  Index.html — 브라우저 SPA                    │
│  google.script.run 으로만 서버와 통신          │
└───────────────────┬───────────────────────────┘
                     │ google.script.run (비동기 RPC)
┌───────────────────▼───────────────────────────┐
│  서버 진입점 계층 (Entry)                      │
│  Code.gs   — doGet, onEdit, addRow/updateRow/  │
│               deleteRow, setAssetPrice,        │
│               getPortfolioData, getAssetTypes/ │
│               addAssetType/deleteAssetType     │
│  Menu.gs   — onOpen, initSheet, updateAllFormulas│
└───────────────────┬───────────────────────────┘
                     │ 함수 호출
┌───────────────────▼───────────────────────────┐
│  로직 계층 (Business / Formula)                │
│  PriceFetcher.gs — setPriceAndRateFormula,     │
│                     columnToLetter             │
└───────────────────┬───────────────────────────┘
                     │ 함수 호출
┌───────────────────▼───────────────────────────┐
│  공통 유틸 계층 (Infrastructure)               │
│  Utils.gs — getDataSheet, getLastDataRow,      │
│              initAssetTypesSheet_              │
└───────────────────┬───────────────────────────┘
                     │ Apps Script 내장 서비스
┌───────────────────▼───────────────────────────┐
│  데이터 계층                                    │
│  Google Sheets — TradingLog 시트, AssetTypes 시트│
└─────────────────────────────────────────────────┘
```

## 아키텍처 패턴

- **패턴 이름**: 없음(전통적인 MVC/Clean Architecture가 아님) — Apps Script 특유의 **"전역 함수 + 시트를 상태 저장소로 사용"** 패턴에 가깝다.
- **레이어 분리는 파일 단위로만 존재한다.** Apps Script는 프로젝트 내 모든 `.gs` 파일의 최상위 함수를 하나의 전역 스코프에서 공유하므로, `import`/`require` 없이도 어떤 파일의 함수든 다른 파일에서 바로 호출할 수 있다. 파일 이름은 순수하게 "책임 구분을 위한 관례"다.
- **클라이언트-서버 경계는 명확하다.** `Index.html`은 `google.script.run`이라는 단일 채널로만 서버 함수를 호출하며, 서버 함수를 직접 import하거나 REST로 부르지 않는다.

## 모듈 요약

| 파일 | 계층 | 책임 한 줄 요약 |
|------|------|-----------------|
| `Index.html` | Presentation | 웹앱 UI 렌더링 + 사용자 입력 처리 + `google.script.run` 호출 |
| `Code.gs` | Entry (웹앱/CRUD) | 상수, 웹앱 진입점, 포트폴리오 CRUD, 자산구분 CRUD |
| `Menu.gs` | Entry (시트 메뉴) | 커스텀 메뉴 등록, 시트 초기화(헤더·서식·수식 세팅) |
| `PriceFetcher.gs` | Business/Formula | 행 단위 수식(총매입금액·수익률·손절액) 설정 |
| `Utils.gs` | Infrastructure | 시트 조회 헬퍼, AssetTypes 시트 초기화 |

## 진입점 요약

| 트리거/진입점 | 위치 | 종류 |
|---|---|---|
| `doGet()` | Code.gs | 웹앱 HTTP 진입점 |
| `onOpen()` | Menu.gs | 심플 트리거 — 스프레드시트 열릴 때 |
| `onEdit(e)` | Code.gs | 심플 트리거 — 셀 편집 시 |
| `google.script.run.loadData()` (페이지 로드 시) | Index.html | 클라이언트 초기 데이터 로드 |

자세한 내용은 `entry-points.md`, 함수 간 호출 관계는 `dependencies.md`, 데이터 흐름은 `data-flow.md`, 파일별 함수 목록은 `modules.md`를 참고.

## 눈에 띄는 설계 포인트

- **고팬인(fan-in) 함수 2개가 `@MX:ANCHOR`로 명시적으로 표시되어 있다** (`Code.gs` 내 주석): `getAssetTypes()` (fan_in=4), `updateAssetDropdown_()` (fan_in=3). 이 두 함수를 수정할 때는 호출하는 4곳/3곳 모두에 영향이 간다.
- **순환 의존성 없음.** Utils.gs → (다른 파일에 의존하지 않음), PriceFetcher.gs → Utils.gs 상수만 참조, Code.gs/Menu.gs → PriceFetcher.gs + Utils.gs를 호출하는 단방향 구조.
- **고아 모듈 없음.** 5개 파일 모두 최소 한 곳 이상에서 실제로 사용된다.
