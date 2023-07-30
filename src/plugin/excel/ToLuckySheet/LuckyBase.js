export class LuckyFileBase {
  constructor() {
    this.info = null;
    this.sheets = [];
  }
}


export class LuckyFileInfo {
  name
  creator
  lastmodifiedby
  createdTime
  modifiedTime
  company
  appversion
}



export class LuckySheetBase {
  name
  color
  config
  index
  status
  order
  row
  column
  luckysheet_select_save
  scrollLeft
  scrollTop
  zoomRatio
  showGridLines
  defaultColWidth
  defaultRowHeight

  celldata
  chart
  isPivotTable
  pivotTable
  luckysheet_conditionformat_save
  freezen
  calcChain
  images
}

export class LuckyImageBase {
  border
  crop
  default
  fixedLeft
  fixedTop
  isFixedPos
  originHeight
  originWidth
  src
  type
}


export class LuckyConfig {
  merge
  borderInfo
  rowlen
  columnlen
  rowhidden
  colhidden
  customHeight
  customWidth
}


export class LuckysheetCalcChain {
  r
  c
  index
}


export class LuckySheetConfigMerge {
  r
  c
  rs
  cs
}

export class LuckySheetCelldataBase {
  r
  c
  v
}

export class LuckySheetborderInfoCellValueStyle {
  style
  color
}


export class LuckySheetCelldataValue {
  ct
  bg
  ff
  fc
  bl
  it
  fs
  cl
  un
  vt
  ht
  mc
  tr
  tb
  v
  m
  f
  rt
  qp
}

export class LuckySheetCellFormat {
  fa
  t
  s
}

export class LuckySheetborderInfoCellForImp {
  rangeType
  value
}

export class LuckySheetborderInfoCellValue {
  row_index
  col_index
  l
  r
  t
  b
}

export class LuckyInlineString {
  ff
  fc
  fs
  cl
  un
  bl
  it
  va
  v
}
