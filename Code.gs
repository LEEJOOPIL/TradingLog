// ── 상수 ──────────────────────────────────────────────
const SHEET_NAME       = 'TradingLog';
const ASSET_SHEET_NAME = 'AssetTypes';
const DEFAULT_ASSETS   = ['금', '은', '비트코인', '이더리움', '솔라나', 'USDT', 'USDC'];
const DATA_START    = 2;
const COL_DATE      = 1;  // A: 날짜
const COL_CAT       = 2;  // B: 자산구분
const COL_BUY       = 3;  // C: 매입가
const COL_QTY       = 4;  // D: 수량
const COL_TOTAL     = 5;  // E: 총매입금액 (자동)
const COL_CUR       = 6;  // F: 현재가 (수동)
const COL_RATE      = 7;  // G: 수익률 (자동)
const COL_STOP      = 8;  // H: 손절가
const COL_STOP_AMT  = 9;  // I: 손절액 (자동)
const COL_CHECK     = 10; // J: 포함여부 (체크박스)
const COL_REASON    = 11; // K: 투자이유
const SUM_LABEL_COL = 13; // M: 요약 라벨
const SUM_VAL_COL   = 14; // N: 요약 값
const SUM_START_ROW = 3;

// ── 트리거: 자산구분 변경 시 수식 자동 설정 ────────────
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row < DATA_START) return;

  if (col === COL_CAT) {
    setPriceAndRateFormula(sheet, row);
  }
}

// ── 전체 수식 갱신 (메뉴에서 수동 실행) ───────────────
function updateAllFormulas() {
  const sheet   = getDataSheet();
  const lastRow = getLastDataRow(sheet);  // B열 배치 읽기 → API 1회
  if (lastRow < DATA_START) {
    SpreadsheetApp.getUi().alert('✅ 수식 갱신 완료!');
    return;
  }

  const numRows = lastRow - DATA_START + 1;
  const catVals = sheet.getRange(DATA_START, COL_CAT, numRows, 1).getValues();

  for (let i = 0; i < numRows; i++) {
    if (!String(catVals[i][0]).trim()) continue;
    setPriceAndRateFormula(sheet, DATA_START + i);
  }

  SpreadsheetApp.getUi().alert('✅ 수식 갱신 완료!');
}

// ── 웹앱 진입점 ─────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('TradingLog 📈')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── 포트폴리오 + 요약 데이터 반환 (웹앱용) ───────────────
function getPortfolioData() {
  const sheet   = getDataSheet();
  const lastRow = sheet.getLastRow();
  const rows    = [];

  // 데이터 행 처리
  if (lastRow >= DATA_START) {
    const numRows = lastRow - DATA_START + 1;
    const allVals = sheet.getRange(DATA_START, 1, numRows, COL_REASON).getValues();
    for (var i = 0; i < numRows; i++) {
      const row = allVals[i];
      const cat = String(row[COL_CAT - 1]).trim();
      if (!cat) continue;

      const dv = row[COL_DATE - 1];
      let dateStr = '';
      if (dv instanceof Date) {
        const y = dv.getFullYear();
        const m = String(dv.getMonth() + 1).padStart(2, '0');
        const d = String(dv.getDate()).padStart(2, '0');
        dateStr = y + '-' + m + '-' + d;
      } else if (dv) {
        dateStr = String(dv);
      }

      rows.push({
        sheetRow: DATA_START + i,
        date:    dateStr,
        cat:     cat,
        buy:     row[COL_BUY      - 1],
        qty:     row[COL_QTY      - 1],
        total:   row[COL_TOTAL    - 1],
        cur:     row[COL_CUR      - 1],
        rate:    row[COL_RATE     - 1],
        stop:    row[COL_STOP     - 1],
        stopAmt: row[COL_STOP_AMT - 1],
        checked: row[COL_CHECK    - 1],
        reason:  row[COL_REASON   - 1]
      });
    }
  }

  var totalBuy = 0;
  var totalVal = 0;
  rows.forEach(function(r) {
    totalBuy += Number(r.total) || 0;
    if (r.checked) {
      totalVal += (Number(r.stop) || 0) * (Number(r.qty) || 0);
    } else {
      totalVal += (Number(r.cur)  || 0) * (Number(r.qty) || 0);
    }
  });
  var totalProfit = totalVal - totalBuy;
  var totalRate   = totalBuy !== 0 ? (totalProfit / totalBuy * 100) : 0;
  const summary = {
    totalBuy:    totalBuy,
    totalVal:    totalVal,
    totalProfit: totalProfit,
    totalRate:   totalRate
  };

  // AssetTypes 시트 A:B 단일 읽기 → assetTypes(이름 배열) + assetSymbols(맵) 인라인 조립
  // (readAssetRows_() 1회 호출로 두 값 모두 파생 — 별도 getAssetSymbolMap_() 헬퍼 없음, plan.md §C)
  const assetRows  = readAssetRows_();
  const assetTypes = assetRows.length
    ? assetRows.map(function(r) { return r.name; }).filter(function(v) { return v; })
    : DEFAULT_ASSETS.slice();
  const assetSymbols = {};
  assetRows.forEach(function(r) {
    if (r.name) assetSymbols[r.name] = r.symbol;
  });

  return JSON.stringify({ rows: rows, summary: summary, assetTypes: assetTypes, assetSymbols: assetSymbols });
}

// ── 행 데이터 쓰기 헬퍼 ─────────────────────────────────
function writeRowData(sheet, row, data) {
  const p       = String(data.date).split('-');
  const dateVal = new Date(+p[0], +p[1] - 1, +p[2]);
  const curVal  = (data.cur  !== '' && data.cur  != null) ? Number(data.cur)  : '';
  const stopVal = (data.stop !== '' && data.stop != null) ? Number(data.stop) : '';

  // A-K 를 한 번에 쓰기 (E·G·I 수식 셀은 빈 값 → setPriceAndRateFormula 에서 덮어씀)
  sheet.getRange(row, 1, 1, 11).setValues([[
    dateVal,                    // A COL_DATE
    String(data.cat),           // B COL_CAT
    Number(data.buy),           // C COL_BUY
    Number(data.qty),           // D COL_QTY
    '',                         // E COL_TOTAL  (수식)
    curVal,                     // F COL_CUR
    '',                         // G COL_RATE   (수식)
    stopVal,                    // H COL_STOP
    '',                         // I COL_STOP_AMT (수식)
    !!data.checked,             // J COL_CHECK
    String(data.reason || '')   // K COL_REASON
  ]]);
}

// ── 행 추가 (웹앱용) ─────────────────────────────────────
function addRow(data) {
  const sheet  = getDataSheet();
  const newRow = Math.max(getLastDataRow(sheet) + 1, DATA_START);
  writeRowData(sheet, newRow, data);
  setPriceAndRateFormula(sheet, newRow, data.cat);  // cat 전달 → 시트 읽기 생략
  return getPortfolioData();
}

// ── 행 수정 (웹앱용) ─────────────────────────────────────
function updateRow(sheetRow, data) {
  const sheet = getDataSheet();
  writeRowData(sheet, sheetRow, data);
  setPriceAndRateFormula(sheet, sheetRow, data.cat);  // cat 전달 → 시트 읽기 생략
  return getPortfolioData();
}

// ── 행 삭제 (웹앱용) ─────────────────────────────────────
function deleteRow(sheetRow) {
  getDataSheet().deleteRow(sheetRow);
  return getPortfolioData();
}

// ── 자산별 현재가 일괄 설정 (웹앱용) ─────────────────────
function setAssetPrice(cat, price) {
  const sheet   = getDataSheet();
  const lastRow = getLastDataRow(sheet);
  if (lastRow < DATA_START) return getPortfolioData();

  const numRows  = lastRow - DATA_START + 1;
  const catVals  = sheet.getRange(DATA_START, COL_CAT, numRows, 1).getValues();
  const priceVal = (price !== '' && price != null && price !== false) ? Number(price) : '';

  catVals.forEach(function(row, i) {
    if (String(row[0]).trim() === String(cat).trim()) {
      sheet.getRange(DATA_START + i, COL_CUR).setValue(priceVal);
    }
  });

  return getPortfolioData();
}

// ── AssetTypes 시트 A:B 단일 읽기 (내부 헬퍼) ──────────────
// @MX:NOTE fan_in=2 — getAssetTypes/getPortfolioData 모두 의존, A:B 동시 읽기로 시트 API 호출 1회 유지
function readAssetRows_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ASSET_SHEET_NAME);
  if (!sheet) sheet = initAssetTypesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const vals = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  return vals.map(function(r) {
    return { name: String(r[0]).trim(), symbol: String(r[1] || '').trim() };
  });
}

// ── 자산 종류 목록 반환 (웹앱용) ───────────────────────
// @MX:ANCHOR fan_in=4 — addAssetType/deleteAssetType/getPortfolioData/updateAssetDropdown_ 모두 의존
// @MX:REASON 외부 시그니처(반환 string[])는 M2 재구성 이후에도 불변 — readAssetRows_() 기반 내부 구현으로 교체됨(plan.md §C)
function getAssetTypes() {
  const rows = readAssetRows_();
  if (!rows.length) return DEFAULT_ASSETS.slice();
  return rows.map(function(r) { return r.name; }).filter(function(v) { return v; });
}

// ── 자산 추가 (웹앱용) ─────────────────────────────────
function addAssetType(name) {
  const trimmed = String(name).trim();
  if (!trimmed) return JSON.stringify({ error: '자산명을 입력하세요.' });

  const assets = getAssetTypes();
  const exists = assets.some(function(a) { return a.toLowerCase() === trimmed.toLowerCase(); });
  if (exists) return JSON.stringify({ error: '이미 존재하는 자산입니다.' });

  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ASSET_SHEET_NAME);
  if (!sheet) sheet = initAssetTypesSheet_();
  sheet.appendRow([trimmed]);
  updateAssetDropdown_();
  return getPortfolioData();
}

// ── 자산 삭제 (웹앱용) ─────────────────────────────────
function deleteAssetType(name, force) {
  if (force !== true) {
    const count = countAssetUsage_(name);
    if (count > 0) {
      return JSON.stringify({ needsConfirm: true, count: count, assetTypes: getAssetTypes() });
    }
  }
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ASSET_SHEET_NAME);
  if (sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < vals.length; i++) {
        if (String(vals[i][0]).trim() === String(name).trim()) {
          sheet.deleteRow(i + 2);
          break;
        }
      }
    }
  }
  updateAssetDropdown_();
  return getPortfolioData();
}

// ── 자산 심볼 등록/수정 (웹앱용) ─────────────────────────
function setAssetSymbol(name, symbol) {
  const trimmedName   = String(name).trim();
  const trimmedSymbol = String(symbol == null ? '' : symbol).trim();

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ASSET_SHEET_NAME);
  if (sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < vals.length; i++) {
        if (String(vals[i][0]).trim() === trimmedName) {
          sheet.getRange(i + 2, 2).setValue(trimmedSymbol);
          return getPortfolioData();
        }
      }
    }
  }
  return JSON.stringify({ error: '존재하지 않는 자산입니다.' });
}

// ── 바이낸스 시세 조회 (웹앱용) ─────────────────────────
// @MX:NOTE 이 프로젝트 최초의 외부 API 연동(data-api.binance.vision, 2026-08-25 지역 차단(451) 회피용 미러로 전환 — 실사용자 실측으로 확인됨) — muteHttpExceptions 필수(research.md §2.4, §4)
function fetchBinancePrice(cat) {
  const rows = readAssetRows_();
  let symbol = '';
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].name === String(cat).trim()) {
      symbol = rows[i].symbol;
      break;
    }
  }
  if (!symbol) {
    return JSON.stringify({ error: '심볼이 등록되지 않았습니다' });
  }

  const url = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=' + encodeURIComponent(symbol);

  let res;
  try {
    res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  } catch (e) {
    return JSON.stringify({ error: '네트워크 오류' });
  }

  const code = res.getResponseCode();
  if (code === 400) return JSON.stringify({ error: '심볼을 찾을 수 없습니다' });
  if (code === 429) return JSON.stringify({ error: '요청이 많습니다. 잠시 후 다시 시도하세요' });
  if (code === 418) return JSON.stringify({ error: '일시적으로 조회가 차단되었습니다' });
  if (code === 451) return JSON.stringify({ error: '이 지역에서 조회할 수 없습니다' });
  if (code !== 200) return JSON.stringify({ error: '조회 중 오류가 발생했습니다' });

  let parsed;
  try {
    parsed = JSON.parse(res.getContentText());
  } catch (e) {
    return JSON.stringify({ error: '응답 형식 오류' });
  }

  const raw = parsed.price;
  const parsedPrice = parseFloat(raw);
  if (!isFinite(parsedPrice)) {
    return JSON.stringify({ error: '가격 형식 오류' });
  }

  // 소수점 둘째 자리 반올림 (research.md §7.3 — 절반 지점 정확도 목적이 아니라 명세 정의된 단일 연산이기 때문)
  const rounded = Number(parseFloat(raw).toFixed(2));
  if (rounded === 0 && parsedPrice > 0) {
    // 0 붕괴 가드 (REQ-024) — 1센트 미만 자산을 조용히 0으로 채우지 않는다
    return JSON.stringify({ error: '가격이 너무 작아 표시할 수 없습니다' });
  }

  return JSON.stringify({ price: rounded, symbol: symbol });
}

// ── B열 드롭다운 갱신 (내부 헬퍼) ──────────────────────
// @MX:ANCHOR fan_in=3 — addAssetType/deleteAssetType/initSheet 모두 의존
function updateAssetDropdown_() {
  const assets = getAssetTypes();
  const list   = assets.length ? assets : DEFAULT_ASSETS.slice();
  const validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(list, true)
    .setAllowInvalid(true)
    .build();
  getDataSheet().getRange(DATA_START, COL_CAT, 998).setDataValidation(validation);
}

// ── 자산 사용 행 수 카운트 (내부 헬퍼) ─────────────────
function countAssetUsage_(name) {
  try {
    const sheet   = getDataSheet();
    const lastRow = getLastDataRow(sheet);
    if (lastRow < DATA_START) return 0;
    const catVals = sheet.getRange(DATA_START, COL_CAT, lastRow - DATA_START + 1, 1).getValues();
    return catVals.filter(function(r) { return String(r[0]).trim() === String(name).trim(); }).length;
  } catch (e) {
    return 0;
  }
}
