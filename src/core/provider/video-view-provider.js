import $ from 'jquery'
// import File from '../File'
// import { moduleStore } from '../store/module-store';
//
// var asyncViewerResource = null, asyncConfigResource = null;
import VideoPlugin from '../../plugin/media/video-plugin'
function videoViewProvider() {
  return $.Deferred().resolve(VideoPlugin)
}


export default videoViewProvider
