# Acceptance Criteria: SPEC-ASSET-001 — 자산 종류 동적 관리

## 시나리오 1: 기본 자산 자동 초기화 (REQ-ASSET-001)

**Given** TradingLog 스프레드시트에 `AssetTypes` 시트가 존재하지 않고  
**When** `initSheet()` 메뉴 항목을 실행하면  
**Then** `AssetTypes` 시트가 생성되고, A1에 "자산명" 헤더, A2~A8에 금·은·비트코인·이더리움·솔라나·USDT·USDC가 순서대로 입력된다  
**And** TradingLog 시트 B열 드롭다운에 7개 자산이 선택 가능하다

---

## 시나리오 2: 새 자산 추가 성공 (REQ-ASSET-003)

**Given** 웹앱이 로드되어 자산 관리 패널이 표시되고  
**When** 사용자가 입력 필드에 "XRP"를 입력하고 추가 버튼을 클릭하면  
**Then** `AssetTypes` 시트에 "XRP" 행이 추가되고  
**And** 현재가 설정 패널에 XRP 입력 필드가 나타나고  
**And** 모달의 자산구분 드롭다운에 "XRP" 옵션이 추가된다  
**And** TradingLog 시트 B열 드롭다운에도 "XRP"가 포함된다

---

## 시나리오 3: 중복 자산 추가 거부 (REQ-ASSET-003)

**Given** "비트코인"이 이미 AssetTypes에 존재하고  
**When** 사용자가 입력 필드에 "비트코인"을 입력하고 추가 버튼을 클릭하면  
**Then** 자산이 추가되지 않고  
**And** "이미 존재하는 자산입니다" 오류 메시지가 표시된다  
**And** AssetTypes 시트에 중복 행이 생기지 않는다

---

## 시나리오 4: 미사용 자산 삭제 (REQ-ASSET-004)

**Given** "XRP"가 AssetTypes에 존재하고, TradingLog에 XRP 매입 행이 0개이며  
**When** 사용자가 자산 관리 패널에서 XRP의 삭제 버튼을 클릭하면  
**Then** 확인 다이얼로그 없이 즉시 삭제되고  
**And** 자산 관리 패널과 드롭다운에서 XRP가 사라진다

---

## 시나리오 5: 사용 중인 자산 삭제 — 경고 후 허용 (REQ-ASSET-004)

**Given** "비트코인"이 AssetTypes에 존재하고, TradingLog에 비트코인 매입 행이 3개이며  
**When** 사용자가 비트코인의 삭제 버튼을 클릭하면  
**Then** "3개 매입 행이 있습니다. 삭제하면 해당 행의 자산구분은 유지되나 드롭다운에서 제거됩니다. 계속할까요?" 경고가 표시되고  
**And** 사용자가 확인을 클릭하면 삭제가 실행되고  
**And** 기존 3개 행의 자산구분 값("비트코인")은 그대로 유지된다  
**And** 드롭다운에서는 비트코인이 제거되나, setAllowInvalid(true)로 기존 값은 오류 없이 유지된다

---

## 시나리오 6: 빈 이름 추가 거부 (REQ-ASSET-003)

**Given** 자산 관리 패널이 표시되고  
**When** 사용자가 빈 입력 필드에서 추가 버튼을 클릭하거나 공백만 입력하면  
**Then** 자산이 추가되지 않고 입력 오류 표시가 나타난다

---

## 시나리오 7: 매입 행 없는 자산도 현재가 패널에 표시 (REQ-ASSET-006)

**Given** AssetTypes에 "XRP"가 등록되어 있고 TradingLog에 XRP 매입 행이 없는 상태에서  
**When** 웹앱을 로드하면  
**Then** 현재가 설정 패널에 XRP 입력 필드가 표시된다

---

## 품질 게이트

- 자산 추가/삭제 후 `getPortfolioData()` 응답의 `assetTypes` 배열이 갱신된 목록을 반환한다
- `initSheet()` 재실행 시 기존 AssetTypes 데이터가 삭제되지 않는다
- AssetTypes 시트가 없을 때 웹앱 로드 시 오류 없이 기본 7개가 표시된다
- 드롭다운 갱신은 항상 단일 `setDataValidation()` 호출로 처리된다 (API 호출 최소화)
