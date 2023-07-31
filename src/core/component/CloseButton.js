import Backbone from 'backbone'
import { _templateStore } from '../store/template-store'

const CloseButton = Backbone.View.extend({

  className: 'fv-close-button',

  events: {
    'click': '_close'
  },

  tagName: 'span',

  initialize: function (options) {
    this._fileViewer = options.fileViewer;
  },

  render: function () {
    this.$el.html(_templateStore.get('controlCloseButton')());
    return this;
  },

  _close: function (e) {
    e.preventDefault();
    this._fileViewer.analytics.send('files.fileviewer-web.closed', {
      actionType: 'button'
    });
    this._fileViewer.close();
  }
});


export default CloseButton
