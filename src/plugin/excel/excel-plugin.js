import $ from "jquery";
import BaseViewer from '../../core/component/BaseViewer'
import '../../resource/luckysheet/plugins/css/pluginsCss.css'
import '../../resource/luckysheet/plugins/plugins.css'
import '../../resource/luckysheet/assets/iconfont/iconfont.css'
import '../../resource/luckysheet/css/luckysheet.css'
window.jQuery = $;
window.$ = $;
import { LuckyExcelHelpers } from './luckyExcelHelpers'
import { _templateStore } from '../../core/store/template-store'
const excelPlugin = BaseViewer.extend({
  id: 'cp-excel-preview',
  initialize: function() {
    BaseViewer.prototype.initialize.apply(this, arguments);
  },
  render() {
    this.$el.show().html(_templateStore.get('waitingMessage')({
      src: '',
      header: '您的预览即将出现!',
      message: '着急吗？您现在可以下载原件。'
    }));
    window.$loadLuckySheet((res) => {
      this.$el.html(`<div id="luckysheet" style=" margin: 0px; padding: 0px;position: absolute;width: 100%;max-width: 80%;left: 50%;top: 0;transform: translateX(-50%);bottom: 0px;"></div>`);
      if(window.luckysheet) {
        LuckyExcelHelpers.transformExcelToLuckyByUrl(this._previewSrc
          , '', (exportJson, luckysheetfile) => {
            if(exportJson.sheets==null || exportJson.sheets.length==0){
              // alert("Failed to read the content of the excel file, currently does not support xls files!");
              return;
            }
            window.luckysheet.destroy();
            const options = {
              container: 'luckysheet', //luckysheet为容器id
              title: '',
              showtoolbar: false,
              showinfobar: false,
              data: exportJson.sheets,
              editMode: false,
            }
            window.luckysheet.create(options);
          })
      }
    })
    return this;
  }
});

export default excelPlugin;
