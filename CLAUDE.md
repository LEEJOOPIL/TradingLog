# TradingLog — 투자 기록 앱

## 프로젝트 개요

Google Sheets + Google Apps Script 기반 투자 기록 관리 앱.
브라우저 웹앱 UI에서 자산(금·은·암호화폐)의 매입 내역을 입력하고, 현재가를 수동으로 설정해 수익률 및 손절 손실을 추적한다.

## 기술 스택

- **플랫폼**: Google Sheets + Google Apps Script Web App
- **로직**: Google Apps Script (JavaScript)
- **UI**: `Index.html` — 브라우저 기반 SPA (google.script.run으로 서버 함수 호출)
- **가격 소스**: 수동 입력 기본 + 심볼이 등록된 자산은 바이낸스 현물가 조회 보조 (SPEC-PRICE-001)
  - 웹앱 "현재가 설정" 패널에서 자산 종류별 일괄 입력
  - 개별 행은 모달 편집으로 직접 입력 가능
  - 자산에 바이낸스 심볼이 등록되어 있으면 해당 자산 행에 "값 가져오기" 버튼이 나타나 시세를 입력 필드에만 채워 넣는다(시트 반영은 여전히 "적용" 버튼 전용). 조회는 브라우저 `fetch()`로 직접 수행하며 Apps Script 서버를 거치지 않는다(구글 클라우드 IP 지역 차단 회피, 2026-08-25)
  - 금·은은 바이낸스에 현물 페어가 없어 별도로 자산에 금속시세 심볼(`XAU`/`XAG`)이 등록되어 있으면 동일한 "값 가져오기" 버튼으로 gold-api.com 시세를 조회한다(SPEC-PRICE-002). 이 조회도 브라우저 `fetch()`로 직접 수행하며 Apps Script 서버를 거치지 않는다

## 데이터 구조

### 종목 테이블 (A~K열, 2행~)

| 열 | 항목 | 설명 |
|----|------|------|
| A | 날짜 | 날짜 피커 (yyyy-mm-dd) |
| B | 자산구분 | 드롭다운: `AssetTypes` 시트에서 동적으로 읽어 설정 (기본 7개: 금·은·비트코인·이더리움·솔라나·USDT·USDC) |
| C | 매입가 | 1단위당 매입 단가 (USD) |
| D | 수량 | 보유 수량 |
| E | 총매입금액 | 자동 수식: `매입가 × 수량` |
| F | 현재가 | **수동 입력** (USD) — 웹앱 "현재가 설정" 패널 또는 행 편집 모달로 입력 |
| G | 수익률 | 자동 수식: `(현재가 - 매입가) / 매입가 × 100` (현재가 미입력 시 빈 값) |
| H | 손절가 | 수동 입력 (USD) |
| I | 손절액 | 자동 수식: `(손절가 - 매입가) × 수량` |
| J | 포함여부 | 체크박스 — 체크 시 손절 실현 처리 (종합 요약에 손절가 기준 반영) |
| K | 투자이유 | 수동 입력 |

> ⚠ 모든 금액은 USD 기준. 매입가·손절가도 USD로 입력해야 정확한 수익률 계산 가능.

### 종합 요약 (M~N열, 시트 내)

| 셀 | 항목 | 설명 |
|----|------|------|
| N3 | 총 매입금액 | 전체 행의 E열 합계 |
| N4 | 총 평가금액 | 오픈 포지션(J=미체크): 현재가×수량 / 손절 실현(J=체크): 손절가×수량 |
| N5 | 총 수익금액 | N4 - N3 |
| N6 | 종합 수익률 | (N4 - N3) / N3 × 100 |
| N7 | 총 평가금액(KRW) | N4 × GOOGLEFINANCE("CURRENCY:USDKRW") — 시트 전용, 웹앱 미표시 |
| N8 | 환율(USD/KRW) | GOOGLEFINANCE("CURRENCY:USDKRW") — 시트 전용, 웹앱 미표시 |

> 웹앱 요약 카드는 총 매입금액·총 평가금액·총 수익금액·종합 수익률 4개만 표시. KRW 항목은 웹앱에서 제거됨.

### AssetTypes 시트

자산구분 목록을 별도 시트에 저장하여 동적으로 관리한다.

| 열 | 항목 | 설명 |
|----|------|------|
| A | 자산명 | 자산구분 이름 (예: 금, 비트코인, XRP) |

- A1: "자산명" 헤더 (굵게)
- A2~: 자산 이름 목록 (기본 7개 자동 삽입)
- `initSheet()` 또는 웹앱 최초 로드 시 자동 생성 (기존 데이터 있으면 유지)
- 웹앱 자산 관리 패널에서 추가·삭제 가능

## Apps Script 파일 구성

| 파일 | 역할 |
|------|------|
| `Code.gs` | 상수 정의, onEdit 트리거, doGet(웹앱 진입), getPortfolioData, writeRowData, addRow, updateRow, deleteRow, setAssetPrice, updateAllFormulas, getAssetTypes, readAssetRows_, addAssetType, deleteAssetType, setSymbol, setAssetSymbol, setMetalSymbol, updateAssetDropdown_, countAssetUsage_ |
| `PriceFetcher.gs` | setPriceAndRateFormula (수식·포맷 설정), columnToLetter |
| `Menu.gs` | onOpen (메뉴 등록), initSheet (시트 초기화 — AssetTypes 시트 생성 포함) |
| `Utils.gs` | getDataSheet, getLastDataRow (B열 일괄 읽기로 API 1회 최소화), ensureAssetSymbolHeader_, initAssetTypesSheet_ |
| `Index.html` | 웹앱 HTML/CSS/JS — 요약 카드, 자산 관리 패널(심볼 등록 포함), 현재가 설정 패널("값 가져오기" 포함), 데이터 테이블, 입력 모달. 바이낸스 시세 조회를 브라우저 `fetch()`로 직접 수행(`fetchBinancePriceClient_`) — 서버를 거치지 않는다 |

## 메뉴 구성 (투자 관리)

| 메뉴 항목 | 함수 | 설명 |
|-----------|------|------|
| 📊 수식 전체 갱신 | `updateAllFormulas` | 전체 행 수식(E·G·I열) 재설정 |
| 🛠 시트 초기화 | `initSheet` | 헤더·드롭다운·서식·요약 수식 초기화 (데이터 전체 삭제) |

## 웹앱 주요 기능

| 기능 | 설명 |
|------|------|
| 요약 카드 | 총 매입금액·총 평가금액·총 수익금액·종합 수익률 실시간 표시 |
| 자산 관리 패널 | 자산 종류 추가·삭제 — 사용 중인 자산 삭제 시 경고 확인 표시. 추가 즉시 드롭다운·현재가 패널 반영 |
| 현재가 설정 패널 | 자산 목록 전체 표시 (매입 행 없는 자산 포함) → "적용" 클릭 시 해당 자산 전체 F열 일괄 갱신. 심볼이 등록된 자산은 "값 가져오기" 버튼으로 시세를 입력 필드에만 채워 넣을 수 있다(시트 미반영, "적용"과 분리된 2단계 확인 흐름) |
| 데이터 테이블 | 전체 행 목록 — 수정·삭제 버튼 포함 |
| 새 항목 추가 | "+ 새 항목" 버튼 → 모달에서 날짜·자산구분(동적 드롭다운)·매입가·수량·현재가·손절가 입력 |
| 낙관적 렌더링 | 저장·삭제·현재가 적용 시 서버 응답 전에 UI 즉시 반영, 백그라운드에서 동기화 |

## 자산구분 입력값

자산구분 목록은 `AssetTypes` 시트에서 동적으로 관리된다. 웹앱 자산 관리 패널에서 자유롭게 추가·삭제할 수 있다.

**기본 제공 자산 (7개):**

| 자산구분 | 입력값 | 현재가 입력 방법 |
|---------|--------|----------------|
| 금 | 금 | 웹앱 현재가 설정 패널 (USD/oz) |
| 은 | 은 | 웹앱 현재가 설정 패널 (USD/oz) |
| 비트코인 | 비트코인 | 웹앱 현재가 설정 패널 |
| 이더리움 | 이더리움 | 웹앱 현재가 설정 패널 |
| 솔라나 | 솔라나 | 웹앱 현재가 설정 패널 |
| 테더 | USDT | 웹앱 현재가 설정 패널 (보통 $1) |
| USD코인 | USDC | 웹앱 현재가 설정 패널 |

> 사용자가 추가한 자산(예: XRP)은 웹앱 자산 관리 패널의 "자산 종류 추가" 입력 필드로 등록하고, 현재가 설정 패널에서 동일하게 관리한다.

> 자산은 선택적으로 심볼을 하나 가질 수 있다. 자산 관리 패널의 인라인 입력 필드 **하나**에 심볼을 넣고 저장하면, 서버(`setSymbol`)가 값의 형태를 보고 종류를 자동으로 판별한다 — `XAU`·`XAG`(대소문자 무시, 완전 일치)는 금속시세 심볼로 `AssetTypes` C열에, 그 외 값(예: `BTCUSDT`)은 바이낸스 심볼로 B열에 기록되며 반대쪽 열은 비워진다. 입력을 비우고 저장하면 두 열이 모두 비워진다. 저장되는 값은 앞뒤 공백이 제거되고 대문자로 정규화된다. 심볼이 등록된 자산만 현재가 설정 패널에 "값 가져오기" 버튼이 나타난다.

## 성능 설계

- **`getLastDataRow()`**: B열 전체를 `getValues()` 1회로 읽어 JS에서 역방향 스캔 → `initSheet`가 J열 체크박스를 998행까지 설정해도 Sheets API 호출은 1회로 고정
- **`writeRowData()`**: A-K 11열을 `setValues([[...]])` 단일 호출로 일괄 쓰기
- **`setPriceAndRateFormula()`**: `cat` 파라미터를 전달받아 시트 읽기 생략 → 쓰기 버퍼 중간 플러시 방지
- **`getPortfolioData()`**: 데이터 행(A-K)을 `getValues()` 1회로 일괄 읽기, 요약 계산은 JS에서 수행. 응답에 `assetTypes` 배열 포함
- **`getAssetTypes()`**: AssetTypes 시트 1회 읽기로 자산 목록 배열 반환. 시트 없으면 `initAssetTypesSheet_()` 자동 호출
- **`updateAssetDropdown_()`**: `getAssetTypes()` 1회 호출 후 `setDataValidation()` 단일 호출로 B열 998행 일괄 갱신

## 개발 규칙

- Apps Script 파일은 `.gs` 확장자로 로컬 관리 후 에디터에 붙여넣기 방식으로 배포
- 코드 변경 후 반드시 **새 버전으로 재배포**해야 웹앱에 반영됨
- 모든 상수는 `Code.gs` 상단에서 관리 (전체 파일에서 공유됨)
- 함수명은 camelCase 사용
- 웹앱 함수(`addRow`, `updateRow`, `deleteRow`, `setAssetPrice`, `getPortfolioData`, `addAssetType`, `deleteAssetType`)는 `google.script.run`으로만 호출
- 자산 추가/삭제 후 B열 드롭다운 갱신은 항상 `updateAssetDropdown_()` 단일 호출로 처리 (직접 `setDataValidation()` 금지)
