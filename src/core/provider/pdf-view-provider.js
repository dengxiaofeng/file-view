import $ from 'jquery'
// import File from '../File'
import { moduleStore } from '../store/module-store';
import PdfPlugin from '../../plugin/pdf/pdf-plugin';
//
// var asyncViewerResource = null, asyncConfigResource = null;
let asyncViewerResource = null, asyncConfigResource = null;

function pdfViewProvider() {
  if (!asyncViewerResource) {
    asyncViewerResource = moduleStore.get('pdf-viewer');
  }
  if (!asyncConfigResource) {
    asyncConfigResource = moduleStore.get('pdf-config');
  }

  const viewerInstance = $.Deferred();

  $.when(asyncViewerResource, asyncConfigResource).done(function (viewer, config) {
    // const PDFViewer = PdfPlugin
    const PDFJS = window.PDFJS;
    PDFJS.workerSrc = config.workerSrc;
    viewerInstance.resolve(PdfPlugin);
  });
  return viewerInstance.promise()
  // return $.Deferred().resolve(require('../../plugin/pdf/pdf-plugin.js'))
}


export default pdfViewProvider
