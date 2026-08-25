# TradingLog — 기술 스택

## 플랫폼

| 구성 요소 | 선택 | 비고 |
|-----------|------|------|
| 데이터 저장소 | Google Sheets | 별도 DB 없이 스프레드시트를 원장으로 사용 |
| 서버 로직 | Google Apps Script (JavaScript) | `.gs` 파일 5개로 구성 |
| 클라이언트 UI | `Index.html` (바닐라 HTML/CSS/JS SPA) | 프레임워크 없이 `google.script.run`으로 서버 호출 |
| 가격 소스 | 수동 입력(기본/전 자산) + 바이낸스 현물가 조회(보조, 심볼 등록 자산만) | 조회는 브라우저 `fetch()`로 클라이언트에서 직접 수행 — Apps Script 서버(`UrlFetchApp`)를 거치지 않음. 구글 클라우드 서버 IP가 바이낸스에 지역·세션별로 비일관적으로 차단되는 문제(2026-08-25 실측)를 우회하기 위한 아키텍처 결정(SPEC-PRICE-001 §2.5) |
| 배포 | Apps Script 웹앱 (수동 재배포) | 코드 변경 후 반드시 새 버전 배포 필요 |

## 의존성

외부 라이브러리·npm 패키지·서드파티 SDK 없음. Google Apps Script 런타임이 제공하는 `SpreadsheetApp`, `HtmlService` 등 내장 서비스만 사용한다. 이 저장소에는 `package.json`이 없다 — 빌드 도구도, 별도 런타임 설치도 필요하지 않다.

## 성능 설계 원칙

Apps Script는 Google Sheets API 호출 1회마다 지연이 발생하므로, 이 프로젝트는 **API 호출 횟수를 최소화**하는 방향으로 설계되어 있다.

| 함수 | 최적화 방식 |
|------|-------------|
| `getLastDataRow()` | B열 전체를 `getValues()` 1회로 읽어 JS에서 역방향 스캔 → 998행까지 순회해도 API 호출은 1회 |
| `writeRowData()` | A-K 11열을 `setValues([[...]])` 단일 호출로 일괄 쓰기 |
| `setPriceAndRateFormula()` | `cat` 파라미터를 전달받아 시트 재조회 생략 → 쓰기 버퍼 중간 플러시 방지 |
| `getPortfolioData()` | 데이터 행(A-K)을 `getValues()` 1회로 일괄 읽기, 요약 계산은 JS에서 수행 |
| `getAssetTypes()` | AssetTypes 시트를 1회 읽기로 자산 목록 배열 반환 |
| `updateAssetDropdown_()` | `getAssetTypes()` 1회 호출 후 `setDataValidation()` 단일 호출로 B열 998행 일괄 갱신 |

## 프런트엔드 패턴

- **낙관적 렌더링(optimistic rendering)**: 저장·삭제·현재가 적용 시 서버 응답을 기다리지 않고 UI를 먼저 갱신한 뒤, 백그라운드에서 서버와 동기화한다. 사용자가 체감하는 반응 속도를 높이기 위한 선택이다.
- 서버 함수 호출은 전부 `google.script.run`을 통해서만 이루어지며, 직접 REST API를 호출하지 않는다.

## 통화 처리

모든 금액은 USD 기준으로 저장·계산된다. 시트 전용 수식(N7/N8)에서만 `GOOGLEFINANCE("CURRENCY:USDKRW")`로 원화 환산을 보조적으로 제공하며, 웹앱 UI에는 KRW 항목이 노출되지 않는다(SPEC-UI-001에서 의도적으로 제거).

## 테스트 / CI

이 저장소에는 자동화된 테스트 스위트나 CI 파이프라인이 없다. Apps Script 환경 특성상 로직 검증은 Google Sheets 에디터에서 직접 실행해 확인하는 수동 방식을 따른다.
