import '../../dist/esm/resource/lib/pdf'
import FileViewer from "../../dist/esm";
window.FileViewer = FileViewer


var selectors = {
  document: [ 'a[file-preview-type=document]' ]
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


var $files = $(getPreviewableFileSelector())

var files = []

$files.each(function(){
	var $el = $(this).closest('a');
	if ($el.is(documentSelector)) {
	    files.push({
	      type: $el.attr('file-preview-application'),
	      id: $el.attr('file-preview-id'),
	      src: getDownloadUrl($el),
	      title: $el.attr('file-preview-title')
	    })
  	}
})

var viewer = new FileViewer({
  enableMiniMode: true,
  enablePresentationMode: true,
  viewers: [ 'image', 'document' ],
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

$('a').click(function(event){
  event.preventDefault()
  viewer.open({
    id: $(this).attr('file-preview-id')
  });
})



