import $ from 'jquery'
import excelPlugin from '../../plugin/excel/excel-plugin'
function excelViewProvider() {
  return $.Deferred().resolve(excelPlugin)
}

export default excelViewProvider;
