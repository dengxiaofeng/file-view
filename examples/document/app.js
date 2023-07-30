import "../../src/resource/lib/pdf"
import FileViewer from "../../src";
// import { LuckyExcelHelpers } from '../../src/plugin/excel/luckyExcelHelpers'
window.FileViewer = FileViewer
// import '../../src/resource/luckysheet/plugins/css/pluginsCss.css'
// import '../../src/resource/luckysheet/plugins/plugins.css'
// import '../../src/resource/luckysheet/assets/iconfont/iconfont.css'
// import '../../src/resource/luckysheet/css/luckysheet.css'
// import '../../src/resource/luckysheet/plugins/js/plugin'
// import luckysheet from 'luckysheet/dist/luckysheet.umd'


var selectors = {
  document: [ 'a[file-preview-type=document]' ],
  video: ['a[file-preview-type=video]']
};

const getDocumentSelector = function () {
  return selectors.document.join(', ')
}


var documentSelector = getDocumentSelector();

const getPreviewableFileSelector = function () {
  return Object.keys(selectors).map(function (k) {
    return selectors[ k ].join(', ')
  }).filter(Boolean).join(', ')
}

function getDownloadUrl($fileElement) {
  return $fileElement.data('download-url') || $fileElement.attr('href')
}


var $files = $(getPreviewableFileSelector());

console.log("$files", $files)

var files = []

$files.each(function(){
	var $el = $(this).closest('a');
  files.push({
    type: $el.attr('file-preview-application'),
    id: $el.attr('file-preview-id'),
    src: getDownloadUrl($el),
    title: $el.attr('file-preview-title')
  })
	// if ($el.is(documentSelector)) {
	//
  // 	}
})

var viewer = new FileViewer({
  enableMiniMode: true,
  enablePresentationMode: true,
  viewers: [ 'image', 'document', 'video' ],
  appendTo: 'body',
  assets: {
    'pdf-config': {
      workerSrc: '../pdf.worker.js'
    }
  },
  convertServer: 'http://vw.usdoc.cn',
  buildURL(url){
  	return url.replace('192.168.2.231:8086','127.0.0.1:8080')
  }
});

viewer.updateFiles(files);
console.log("files", files);

$('a').click(function(event){
  event.preventDefault()
  console.log("$(this).attr('file-preview-id')", $(this).attr('file-preview-id'))
  viewer.open({
    id: $(this).attr('file-preview-id')
  });
});

// $(function() {
//   const option = {
//     container: 'luckysheet',
//     showinfobar: false
//   }
//   luckysheet.create(option);
//
// })


// LuckyExcelHelpers.transformExcelToLuckyByUrl('/excel', '测试', (exportJson, luckysheetfile) => {
//   if(exportJson.sheets==null || exportJson.sheets.length==0){
//     // alert("Failed to read the content of the excel file, currently does not support xls files!");
//     return;
//   }
//
//   setTimeout(() => {
//     luckysheet.destroy();
//
//     const options = {
//       container: 'luckysheet', //luckysheet为容器id
//       showinfobar: false,
//       // showinfobar: false,
//       // userInfo: false,
//       data: exportJson.sheets,
//       // devicePixelRatio: window.devicePixelRatio,
//       // allowEdit: true,
//       // editMode: true,
//       // rowHeaderWidth: 46,
//       // columeHeaderHeight: 20,
//       // defaultColWidth:73,
//       // defaultRowHeight:19,
//     }
//     luckysheet.create(options);
//   }, 5000)
//
// })
