import FileViewer from './core/component/FileView.js'
import './resource/css/fileview.css'
import minimodePlugin from './plugin/thumbnail/MinimodePlugin'
FileViewer.registerPlugin('minimode', minimodePlugin);
window.$loadLuckySheet= (callback) => {
  if (window.$loadLuckySheet.scriptLoaded) return typeof callback === 'function' && callback();
  const script = document.createElement('script');
  script.src = 'https://mengshukeji.gitee.io/luckysheetdemo/plugins/js/plugin.js';
  document.body.appendChild(script);
  const sheetScript = document.createElement('script');
  sheetScript.src = 'https://mengshukeji.gitee.io/luckysheetdemo/luckysheet.umd.js'
  sheetScript.onload = () => {
    window.$loadLuckySheet.scriptLoaded = true;
    typeof callback === 'function' && callback();
  }
  document.body.appendChild(sheetScript);
}
export default FileViewer
