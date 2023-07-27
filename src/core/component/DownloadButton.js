import Backbone from 'backbone'
import {_templateStore} from '../store/template-store';

var DownloadButton = Backbone.View.extend({
  tagName: 'span',
  events: {
    'click': '_triggerAnalytics'
  },
  initialize: function (options) {
    this._fileViewer = options.fileViewer;
    this._model = this._fileViewer.getCurrentFile();
  },
  render: function () {
    this.$el.html(_templateStore.get('controlDownloadButton')({
      src: this._model.get('srcDownload') || this._model.get('src')
    }));
    return this;
  },

  _triggerAnalytics: function () {
    debugger
    this._fileViewer.trigger('fv.download');
    this._fileViewer.analytics.send('files.fileviewer-web.file.download', {
      actionType: 'button'
    });
  }
}, {
  isDownloadable: function (fileViewer) {
    debugger
    var file = fileViewer.getCurrentFile();
    return file && file.get('downloadable');
  }
})

export default DownloadButton
