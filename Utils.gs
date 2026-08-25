// ── 공통 유틸 ──────────────────────────────────────────


function getDataSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('TradingLog 시트가 없습니다. [투자 관리 > 시트 초기화]를 실행하세요.');
  return sheet;
}

// 데이터가 있는 마지막 행 번호 반환 (B열 일괄 읽기 → API 1회)
function getLastDataRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START) return DATA_START - 1;
  const catVals = sheet.getRange(DATA_START, COL_CAT, lastRow - DATA_START + 1, 1).getValues();
  for (let i = catVals.length - 1; i >= 0; i--) {
    if (String(catVals[i][0]).trim()) return DATA_START + i;
  }
  return DATA_START - 1;
}

// AssetTypes 시트 B1 헤더 멱등 프로비저닝 — 이미 값이 있으면 아무 것도 하지 않는다
function ensureAssetSymbolHeader_(sheet) {
  const cell = sheet.getRange(1, 2);
  if (String(cell.getValue()).trim()) return;
  cell.setValue('바이낸스 심볼').setFontWeight('bold');
}

// AssetTypes 시트 C1 헤더 멱등 프로비저닝 — 이미 값이 있으면 아무 것도 하지 않는다
// (SPEC-PRICE-002 — 금·은 등 금속시세 심볼용 C열. 값은 자동 시드하지 않음, 헤더만 보강)
function ensureMetalSymbolHeader_(sheet) {
  const cell = sheet.getRange(1, 3);
  if (String(cell.getValue()).trim()) return;
  cell.setValue('금속시세 심볼').setFontWeight('bold');
}

// AssetTypes 시트 생성 및 기본값 삽입 (기존 데이터 있으면 유지)
function initAssetTypesSheet_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ASSET_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ASSET_SHEET_NAME);
  if (sheet.getLastRow() >= 2) {
    ensureAssetSymbolHeader_(sheet);
    ensureMetalSymbolHeader_(sheet);
    return sheet;
  }
  sheet.getRange(1, 1).setValue('자산명').setFontWeight('bold');
  sheet.getRange(1, 2).setValue('바이낸스 심볼').setFontWeight('bold');
  sheet.getRange(1, 3).setValue('금속시세 심볼').setFontWeight('bold');
  const defaultSymbols = { '비트코인': 'BTCUSDT', '이더리움': 'ETHUSDT', '솔라나': 'SOLUSDT' };
  const data = DEFAULT_ASSETS.map(function(n) { return [n, defaultSymbols[n] || '']; });
  sheet.getRange(2, 1, data.length, 2).setValues(data);
  return sheet;
}
