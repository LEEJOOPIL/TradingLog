# SPEC-ASSET-001 Compact

## 요구사항

- **REQ-ASSET-001**: initSheet() 실행 시 AssetTypes 시트 없으면 생성, 기본 7개 자산 삽입. 기존 데이터 유지.
- **REQ-ASSET-002**: getPortfolioData() 응답에 `assetTypes` 배열 포함. 시트 없으면 기본 7개 반환.
- **REQ-ASSET-003**: addAssetType(name) — 빈 값·중복 거부. 성공 시 AssetTypes 추가 + B열 드롭다운 갱신.
- **REQ-ASSET-004**: deleteAssetType(name, force) — 사용 중(force=false) 이면 `{needsConfirm:true, count:N}` 반환. force=true 이면 즉시 삭제 + 드롭다운 갱신.
- **REQ-ASSET-005**: 모달 `#f-cat` select를 `assetTypesList`로 동적 렌더링.
- **REQ-ASSET-006**: 현재가 패널을 `assetTypesList` 전체 기준으로 렌더링 (매입 행 없는 자산 포함).
- **REQ-ASSET-007**: 자산 추가/삭제 시 TradingLog B열 드롭다운을 `setDataValidation()` 1회 호출로 갱신. `setAllowInvalid(true)`.

## 수정 파일

- `Code.gs`: 상수 추가, getPortfolioData 수정, getAssetTypes/addAssetType/deleteAssetType/updateAssetDropdown_ 추가
- `Utils.gs`: initAssetTypesSheet_ 추가
- `Menu.gs`: initSheet의 하드코딩 드롭다운 → updateAssetDropdown_ 교체, initAssetTypesSheet_ 호출 추가
- `Index.html`: 자산 관리 패널 HTML 추가, onData/renderPricePanel/populateCatSelect/renderAssetManager/addAsset/deleteAsset JS 추가·수정

## 제외

- 자산 이름 수정(rename)
- 삭제 시 기존 행 자산구분 값 자동 수정
- 자산 정렬 순서 변경 UI

## Acceptance (핵심)

- Given AssetTypes 없을 때 initSheet() → AssetTypes 시트 생성 + 7개 기본 자산
- Given "XRP" 없을 때 addAsset("XRP") → 패널·드롭다운에 XRP 표시
- Given "비트코인" 3개 행 있을 때 deleteAsset("비트코인") → 경고 후 확인 시 삭제, 기존 행 값 유지
- Given AssetTypes에 "XRP" 있고 매입 행 없을 때 → 현재가 패널에 XRP 표시
