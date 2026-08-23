---
id: SPEC-ASSET-001
version: "1.0.0"
status: completed
created: "2026-07-04"
updated: "2026-07-04"
author: pilsogood
priority: medium
issue_number: 0
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-07-04 | 최초 작성 |

---

# SPEC-ASSET-001: 자산 종류 동적 관리

## 개요

현재 자산구분(금·은·비트코인·이더리움·솔라나·USDT·USDC) 목록이 코드와 HTML에 하드코딩되어 있어, 새 자산을 추가하려면 직접 코드를 수정해야 한다. 이 SPEC은 자산 종류를 별도 `AssetTypes` 시트에 저장하고 웹앱에서 추가·삭제·조회를 동적으로 관리하는 기능을 구현한다.

## 범위

**포함:**
- `AssetTypes` 시트 신설 및 기본 7개 자산 자동 삽입
- 웹앱 자산 관리 패널(추가·삭제·목록 표시)
- 모달 드롭다운 동적 렌더링
- 현재가 설정 패널 동적 렌더링 (매입 행 없는 자산도 표시)
- 자산 추가/삭제 시 TradingLog 시트 B열 드롭다운 자동 갱신

**제외:**
- 자산 이름 수정(rename) — 기존 행 데이터 일괄 변경 복잡도로 MVP 제외
- 자산 정렬 순서 변경
- 자산별 단위(oz, BTC 등) 관리
- 삭제 시 기존 행 데이터 자동 수정

---

## 요구사항 (EARS 형식)

### REQ-ASSET-001: AssetTypes 시트 초기화

**[WHERE]** `initSheet()` 또는 `initAssetTypesSheet_()` 함수가 실행될 때  
**[IF]** `AssetTypes` 시트가 존재하지 않으면  
**[System shall]** 헤더("자산명")와 기본 7개 자산(금·은·비트코인·이더리움·솔라나·USDT·USDC)이 포함된 `AssetTypes` 시트를 생성한다.

**[WHERE]** `AssetTypes` 시트가 이미 존재하면  
**[System shall]** 기존 데이터를 유지하고 덮어쓰지 않는다.

---

### REQ-ASSET-002: 자산 종류 조회

**[WHERE]** 웹앱이 `getPortfolioData()`를 호출할 때  
**[System shall]** 응답 JSON에 `assetTypes` 배열(문자열 목록)을 포함한다.

**[WHERE]** `AssetTypes` 시트가 비어있거나 존재하지 않을 때  
**[System shall]** 기본 7개 자산 목록을 반환한다.

---

### REQ-ASSET-003: 자산 종류 추가

**[WHERE]** 사용자가 웹앱 자산 관리 패널에서 이름을 입력하고 추가 버튼을 클릭할 때  
**[IF]** 입력값이 비어있거나 공백만 있으면  
**[System shall]** 추가를 거부하고 오류 메시지를 표시한다.

**[WHERE]** 사용자가 웹앱 자산 관리 패널에서 이름을 입력하고 추가 버튼을 클릭할 때  
**[IF]** 동일한 이름이 이미 존재하면  
**[System shall]** 추가를 거부하고 "이미 존재하는 자산입니다" 오류를 반환한다.

**[WHERE]** 사용자가 웹앱 자산 관리 패널에서 유효한 이름을 입력하고 추가 버튼을 클릭할 때  
**[System shall]** `AssetTypes` 시트에 새 자산을 추가하고, TradingLog 시트 B열 드롭다운을 갱신하며, 갱신된 자산 목록을 웹앱에 즉시 반영한다.

---

### REQ-ASSET-004: 자산 종류 삭제

**[WHERE]** 사용자가 웹앱 자산 관리 패널에서 삭제 버튼을 클릭할 때  
**[IF]** 해당 자산으로 등록된 TradingLog 행이 1개 이상 존재하면  
**[System shall]** "N개 매입 행이 있습니다. 삭제하면 해당 행의 자산구분은 유지되나 드롭다운에서 제거됩니다. 계속할까요?" 경고를 표시하고 사용자 확인 후 삭제를 허용한다.

**[WHERE]** 사용자가 웹앱 자산 관리 패널에서 삭제 버튼을 클릭할 때  
**[IF]** 해당 자산으로 등록된 TradingLog 행이 없으면  
**[System shall]** 즉시 삭제하고 갱신된 목록을 반영한다.

**[WHERE]** 삭제가 실행될 때  
**[System shall]** `AssetTypes` 시트에서 해당 자산 행을 삭제하고 TradingLog 시트 B열 드롭다운을 갱신한다.

---

### REQ-ASSET-005: 웹앱 모달 드롭다운 동적 렌더링

**[WHERE]** 웹앱이 로드될 때 또는 자산 목록이 갱신될 때  
**[System shall]** 모달의 자산구분 `<select>` 옵션을 `assetTypes` 배열로 동적으로 재생성한다.

---

### REQ-ASSET-006: 현재가 설정 패널 동적 렌더링

**[WHERE]** 현재가 설정 패널이 렌더링될 때  
**[System shall]** 매입 행 존재 여부와 무관하게 `assetTypes` 목록의 모든 자산을 표시한다.

**[WHERE]** 동일 자산의 매입 행이 여러 개 있을 때  
**[System shall]** 가장 최근 현재가(마지막으로 입력된 값)를 기본값으로 표시한다.

---

### REQ-ASSET-007: B열 드롭다운 동기화

**[WHERE]** 자산 추가 또는 삭제 후  
**[System shall]** TradingLog 시트 B열(DATA_START 행~998행)의 드롭다운 유효성 검사를 갱신된 `AssetTypes` 목록으로 업데이트한다.

**[WHERE]** AssetTypes 목록이 비어있을 때  
**[System shall]** 드롭다운 유효성 검사를 제거하지 않고 최소한 1개 이상의 항목을 유지한다.

---

## 제외 (What NOT to Build)

- 자산 이름 수정(rename) 기능
- 자산 삭제 시 기존 TradingLog 행의 자산구분 값 자동 수정
- 자산 정렬 순서 재배치 UI
- 자산별 소수점 자리수·단위 설정
- AssetTypes 시트 직접 편집 감지 (onEdit 확장)

---

## 기술 스택 및 제약

- **플랫폼**: Google Apps Script + Google Sheets
- **시트 추가**: `AssetTypes` (탭명 상수 `ASSET_SHEET_NAME = 'AssetTypes'` 으로 관리)
- **API 효율**: `getAssetTypes()`는 시트 1회 읽기로 배열 반환
- **드롭다운 갱신**: `setDataValidation()` 단일 호출로 998행 일괄 처리
- **웹앱 함수**: `addAssetType(name)`, `deleteAssetType(name, force)`, `getPortfolioData()` (수정)
- **동적 렌더링**: `assetTypes`를 전역 변수 `assetTypesList`에 캐시하여 반복 호출 없이 모달/패널 갱신
