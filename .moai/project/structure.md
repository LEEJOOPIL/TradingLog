# TradingLog — 구조 개요

## 최상위 파일 구성

```
TradingLog/
├── Code.gs           # 핵심 로직: 상수, onEdit 트리거, doGet(웹앱 진입점),
│                      #   getPortfolioData, writeRowData, addRow/updateRow/deleteRow,
│                      #   setAssetPrice, updateAllFormulas, getAssetTypes/addAssetType/
│                      #   deleteAssetType, updateAssetDropdown_, countAssetUsage_
├── Menu.gs           # onOpen(메뉴 등록), initSheet(시트 초기화 — AssetTypes 시트 생성 포함)
├── PriceFetcher.gs   # setPriceAndRateFormula(수식·포맷 설정), columnToLetter
├── Utils.gs          # getDataSheet, getLastDataRow(B열 일괄 읽기), initAssetTypesSheet_
├── Index.html        # 웹앱 UI — 요약 카드 / 자산 관리 패널 / 현재가 설정 패널 /
│                      #   데이터 테이블 / 입력 모달 (google.script.run으로 서버 함수 호출)
└── CLAUDE.md         # 프로젝트 지침 문서 — 데이터 구조·개발 규칙의 SSOT(단일 정보 출처)
```

## 파일 간 역할 분담

- **Code.gs**가 상수와 웹앱 진입점(doGet)을 담당하며, 다른 모든 `.gs` 파일에서 공유하는 상수를 상단에서 관리한다.
- **PriceFetcher.gs**는 시트 수식·서식 설정만 전담한다 — `cat` 파라미터를 넘겨받아 시트 재조회 없이 바로 쓰기 때문에, 쓰기 버퍼가 중간에 플러시되지 않는다.
- **Menu.gs**는 사용자가 Google Sheets 메뉴에서 실행하는 두 명령(수식 전체 갱신, 시트 초기화)의 진입점이다.
- **Utils.gs**는 시트 조회 헬퍼를 모아, 다른 파일에서 반복되는 조회 로직을 줄인다.
- **Index.html**은 서버 로직과 완전히 분리된 브라우저 SPA로, `google.script.run`을 통해서만 서버 함수를 호출한다.

## 데이터가 사는 곳 (Google Sheets)

| 시트 | 역할 |
|------|------|
| 종목 테이블 (A~K열) | 매입 내역 원장 — 날짜·자산구분·매입가·수량·현재가·손절가·투자이유 등 |
| 종합 요약 (M~N열) | 총 매입금액·총 평가금액·총 수익금액·종합 수익률 등 집계 수식 |
| AssetTypes 시트 | 자산구분 드롭다운 목록 — 웹앱에서 동적으로 추가·삭제 |

시트 스키마의 열별 상세 정의는 `CLAUDE.md` "데이터 구조" 절이 SSOT다 — 이 문서는 개요만 다루고, 열 단위 세부사항은 중복 기술하지 않는다.

## `.moai/` 디렉터리 (MoAI-ADK 작업 이력)

```
.moai/
├── config/sections/   # MoAI 설정 (언어, 품질 게이트 등 YAML 섹션 파일)
├── project/           # 이 문서들(product.md/structure.md/tech.md)이 위치하는 곳
├── specs/              # SPEC 문서 — 완료된 SPEC-ASSET-001, SPEC-UI-001
└── reports/            # 세션 요약 등 실행 리포트
```

## 배포 방식 (참고)

Apps Script 파일은 이 저장소에서 `.gs` 확장자로 로컬 관리되며, 실제 반영은 Google Apps Script 에디터에 붙여넣고 **새 버전으로 재배포**하는 수동 절차를 따른다 — 이 저장소 자체에는 CI/CD 자동 배포 파이프라인이 없다.
