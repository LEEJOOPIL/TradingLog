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

// AssetTypes 시트 생성 및 기본값 삽입 (기존 데이터 있으면 유지)
function initAssetTypesSheet_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ASSET_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ASSET_SHEET_NAME);
  if (sheet.getLastRow() >= 2) return sheet;
  sheet.getRange(1, 1).setValue('자산명').setFontWeight('bold');
  const data = DEFAULT_ASSETS.map(function(n) { return [n]; });
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  return sheet;
}
