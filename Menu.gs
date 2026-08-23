// ── 커스텀 메뉴 등록 ────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getActiveSpreadsheet()
    .addMenu('투자 관리', [
      { name: '📊 수식 전체 갱신', functionName: 'updateAllFormulas' },
      null,
      { name: '🛠 시트 초기화',   functionName: 'initSheet'         },
    ]);
}

// ── 시트 초기화 ─────────────────────────────────────────
function initSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  sheet.clearFormats();
  sheet.clearContents();

  // ── 헤더 ──
  const headers = ['날짜', '자산구분', '매입가', '수량', '총매입금액', '현재가', '수익률', '손절가', '손절액', '포함여부', '투자이유'];
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1E3A5F')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');

  // ── 열 너비 ──
  sheet.setColumnWidth(COL_DATE,      100);  // A 날짜
  sheet.setColumnWidth(COL_CAT,       100);  // B 자산구분
  sheet.setColumnWidth(COL_BUY,       110);  // C 매입가
  sheet.setColumnWidth(COL_QTY,        80);  // D 수량
  sheet.setColumnWidth(COL_TOTAL,     130);  // E 총매입금액
  sheet.setColumnWidth(COL_CUR,       120);  // F 현재가
  sheet.setColumnWidth(COL_RATE,       90);  // G 수익률
  sheet.setColumnWidth(COL_STOP,      110);  // H 손절가
  sheet.setColumnWidth(COL_STOP_AMT,  120);  // I 손절액
  sheet.setColumnWidth(COL_CHECK,      80);  // J 포함여부
  sheet.setColumnWidth(COL_REASON,    200);  // K 투자이유
  sheet.setColumnWidth(12,             24);  // L 구분 여백
  sheet.setColumnWidth(SUM_LABEL_COL, 120);  // M 요약 라벨
  sheet.setColumnWidth(SUM_VAL_COL,   140);  // N 요약 값

  // ── 날짜 드롭다운 (캘린더 피커) ──
  const dateValidation = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .build();
  sheet.getRange(DATA_START, COL_DATE, 998)
    .setDataValidation(dateValidation)
    .setNumberFormat('yyyy-mm-dd');

  // ── 자산구분 드롭다운 (AssetTypes 시트 기반 동적 관리) ──
  initAssetTypesSheet_();
  updateAssetDropdown_();

  // ── 체크박스 (포함여부) ──
  sheet.getRange(DATA_START, COL_CHECK, 998).insertCheckboxes();

  // ── 숫자 포맷 ──
  sheet.getRange(DATA_START, COL_BUY,  998).setNumberFormat('#,##0.######');
  sheet.getRange(DATA_START, COL_QTY,  998).setNumberFormat('#,##0.######');
  sheet.getRange(DATA_START, COL_STOP, 998).setNumberFormat('#,##0.######');

  // ── 조건부 서식: 수익률(G) 색상 ──
  const rateRange   = sheet.getRange(DATA_START, COL_RATE, 998);
  const greenRule   = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0).setFontColor('#0A7A0A').setRanges([rateRange]).build();
  const redRule     = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor('#CC0000').setRanges([rateRange]).build();

  // ── 조건부 서식: 손절액(I) 색상 ──
  const stopAmtRange  = sheet.getRange(DATA_START, COL_STOP_AMT, 998);
  const stopRedRule   = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor('#CC0000').setRanges([stopAmtRange]).build();
  const stopGreenRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0).setFontColor('#0A7A0A').setRanges([stopAmtRange]).build();

  sheet.setConditionalFormatRules([greenRule, redRule, stopRedRule, stopGreenRule]);

  // ── 종합 요약 헤더 ──
  sheet.getRange(1, SUM_LABEL_COL, 1, 2).merge()
    .setValue('📈 종합 요약 (✅ = 손절 실현)')
    .setFontWeight('bold')
    .setBackground('#2E6B3E')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');

  // ── 요약 라벨 ──
  const labels = ['총 매입금액', '총 평가금액', '총 수익금액', '종합 수익률'];
  labels.forEach((label, i) => {
    sheet.getRange(SUM_START_ROW + i, SUM_LABEL_COL)
      .setValue(label)
      .setFontWeight('bold')
      .setBackground('#F0F4F0');
  });
  sheet.getRange(SUM_START_ROW + 4, SUM_LABEL_COL)
    .setValue('총 평가금액(KRW)')
    .setFontWeight('bold')
    .setBackground('#F0F4F0');
  sheet.getRange(SUM_START_ROW + 5, SUM_LABEL_COL)
    .setValue('환율(USD/KRW)')
    .setFontWeight('bold')
    .setBackground('#F0F4F0');

  // ── 요약 수식 ──
  // 오픈 포지션(미체크): 현재가 기준 / 손절 실현(체크): 손절가 기준
  const dr    = DATA_START;
  const nCol  = columnToLetter(SUM_VAL_COL);  // N
  const eCol  = columnToLetter(COL_TOTAL);    // E
  const fCol  = columnToLetter(COL_CUR);      // F
  const dCol  = columnToLetter(COL_QTY);      // D
  const hCol  = columnToLetter(COL_STOP);     // H 손절가
  const jCol  = columnToLetter(COL_CHECK);    // J 체크박스

  // 총 매입금액 = 전체 행의 총매입금액 합계
  sheet.getRange(SUM_START_ROW, SUM_VAL_COL)
    .setFormula(`=SUMPRODUCT((B${dr}:B1000<>"")*IFERROR(VALUE(${eCol}${dr}:${eCol}1000),0))`)
    .setNumberFormat('#,##0.00');

  // 총 평가금액 = 오픈(현재가×수량) + 손절실현(손절가×수량)
  sheet.getRange(SUM_START_ROW + 1, SUM_VAL_COL)
    .setFormula(
      `=SUMPRODUCT((${jCol}${dr}:${jCol}1000=FALSE)*(B${dr}:B1000<>"")*IFERROR(VALUE(${fCol}${dr}:${fCol}1000),0)*IFERROR(VALUE(${dCol}${dr}:${dCol}1000),0))` +
      `+SUMPRODUCT((${jCol}${dr}:${jCol}1000=TRUE)*(B${dr}:B1000<>"")*IFERROR(VALUE(${hCol}${dr}:${hCol}1000),0)*IFERROR(VALUE(${dCol}${dr}:${dCol}1000),0))`
    )
    .setNumberFormat('#,##0.00');

  // 총 수익금액
  sheet.getRange(SUM_START_ROW + 2, SUM_VAL_COL)
    .setFormula(`=${nCol}${SUM_START_ROW + 1}-${nCol}${SUM_START_ROW}`)
    .setNumberFormat('#,##0.00');

  // 종합 수익률
  sheet.getRange(SUM_START_ROW + 3, SUM_VAL_COL)
    .setFormula(
      `=IF(${nCol}${SUM_START_ROW}=0,0,` +
      `(${nCol}${SUM_START_ROW + 1}-${nCol}${SUM_START_ROW})/${nCol}${SUM_START_ROW}*100)`
    )
    .setNumberFormat('0.00"%"');

  // KRW 총 평가금액 (N7 = N4 × USDKRW 환율)
  sheet.getRange(SUM_START_ROW + 4, SUM_VAL_COL)
    .setFormula(`=IFERROR(${nCol}${SUM_START_ROW + 1}*GOOGLEFINANCE("CURRENCY:USDKRW"),"-")`)
    .setNumberFormat('#,##0');

  // USD/KRW 환율 (N8)
  sheet.getRange(SUM_START_ROW + 5, SUM_VAL_COL)
    .setFormula('=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),"-")')
    .setNumberFormat('#,##0');

  // ── 수익금액·수익률 조건부 서식 ──
  const profitCell  = sheet.getRange(SUM_START_ROW + 2, SUM_VAL_COL);
  const sumRateCell = sheet.getRange(SUM_START_ROW + 3, SUM_VAL_COL);
  const extraRules  = [
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#0A7A0A').setRanges([profitCell]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#CC0000').setRanges([profitCell]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#0A7A0A').setRanges([sumRateCell]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#CC0000').setRanges([sumRateCell]).build(),
  ];
  sheet.setConditionalFormatRules([...sheet.getConditionalFormatRules(), ...extraRules]);

  SpreadsheetApp.getUi().alert(
    '✅ 시트 초기화 완료!\n\n' +
    '입력 방법:\n' +
    '① A열: 날짜 선택\n' +
    '② B열: 자산구분 드롭다운 선택\n' +
    '③ C열: 매입가, D열: 수량 입력\n' +
    '④ H열: 손절가 입력 → 손절액 자동 계산\n' +
    '⑤ J열: 손절 실현 시 체크 → 손절가 기준으로 손실 반영\n' +
    '⑥ K열: 투자이유 입력'
  );
}
