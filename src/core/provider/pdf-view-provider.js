import $ from 'jquery'
// import File from '../File'
import { moduleStore } from '../store/module-store';
//
// var asyncViewerResource = null, asyncConfigResource = null;
var asyncViewerResource = null,
  asyncConfigResource = null;

function pdfViewProvider() {
  debugger
  if (!asyncViewerResource) {
    asyncViewerResource = moduleStore.get('pdf-viewer');
  }
  if (!asyncConfigResource) {
    asyncConfigResource = moduleStore.get('pdf-config');
  }

  console.log(moduleStore.get('pdf-config'))

  var viewerInstance = $.Deferred();

  $.when(asyncViewerResource, asyncConfigResource).done(function (viewer, config) {
    var PDFViewer = require('../../plugin/pdf/pdf-plugin.js')
    var PDFJS = window.PDFJS;
    PDFJS.workerSrc = config.workerSrc;
    // PDFJS.cMapUrl = config.cMapUrl;

    viewerInstance.resolve(PDFViewer);
  });
  return viewerInstance.promise()
  // return $.Deferred().resolve(require('../../plugin/pdf/pdf-plugin.js'))
}


export default pdfViewProvider
