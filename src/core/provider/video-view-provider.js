import $ from 'jquery'
// import File from '../File'
// import { moduleStore } from '../store/module-store';
//
// var asyncViewerResource = null, asyncConfigResource = null;

function videoViewProvider() {
  return $.Deferred().resolve(require('../../plugin/media/video-plugin.js'))
}


export default videoViewProvider
