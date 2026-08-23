// ── 행의 자산구분에 따라 총매입금액·수익률·손절액 수식 설정 ──
function setPriceAndRateFormula(sheet, row, cat) {
  // cat 가 전달되면 시트 읽기 생략 (쓰기 버퍼 플러시 방지)
  const category  = (cat != null) ? String(cat).trim() : String(sheet.getRange(row, COL_CAT).getValue()).trim();
  const totalCell = sheet.getRange(row, COL_TOTAL);
  const priceCell = sheet.getRange(row, COL_CUR);
  const rateCell  = sheet.getRange(row, COL_RATE);

  if (!category) {
    totalCell.clearContent();
    rateCell.clearContent();
    sheet.getRange(row, COL_STOP_AMT).clearContent();
    return;
  }

  const buyCol  = columnToLetter(COL_BUY);
  const qtyCol  = columnToLetter(COL_QTY);
  const curCol  = columnToLetter(COL_CUR);
  const stopCol = columnToLetter(COL_STOP);

  // 총매입금액 = 매입가 × 수량
  totalCell
    .setFormula(`=IFERROR(${buyCol}${row}*${qtyCol}${row},"")`)
    .setNumberFormat('#,##0.00');

  // 손절액 = (손절가 - 매입가) × 수량
  sheet.getRange(row, COL_STOP_AMT)
    .setFormula(`=IFERROR(IF(${stopCol}${row}="","",(${stopCol}${row}-${buyCol}${row})*${qtyCol}${row}),"")`)
    .setNumberFormat('#,##0.00');

  // 현재가: 수동 입력 — 포맷만 설정, 기존 값은 유지
  priceCell.setNumberFormat('#,##0.######');

  // 수익률 = (현재가 - 매입가) / 매입가 × 100 (현재가 미입력 시 빈 값)
  rateCell
    .setFormula(
      `=IFERROR(IF(OR(${buyCol}${row}="",${curCol}${row}=""),"",(${curCol}${row}-${buyCol}${row})/${buyCol}${row}*100),"")`
    )
    .setNumberFormat('0.00"%"');
}

// ── 열 번호 → 열 문자 변환 (1→A, 2→B ...) ─────────────
function columnToLetter(col) {
  return String.fromCharCode(64 + col);
}
