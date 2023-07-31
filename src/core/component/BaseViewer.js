import Backbone from 'backbone'
import _ from 'underscore'

const BaseViewer = Backbone.View.extend({
  contentViewEvents: {
    'click.contentView': '_clickedBackgroundToClose',
    'mousedown.contentView': '_mousedownContentView'
  },
  initialize: function (options) {
    this.events = _.extend(this.events || {}, this.contentViewEvents);
    this._fileViewer = options.fileViewer;
    this._previewSrc = options.previewSrc;
    this._mousedownBackground = null;
  },
  teardown: function () {
  },
  _mousedownContentView: function (e) {
    const $background = this.getBackground ? this.getBackground() : this.$el;
    this._mousedownBackground = $(e.target).is($background);
  },
  _clickedBackgroundToClose: function (e) {
    const mode = this._fileViewer._view._modes[ this._fileViewer._view._mode ];
    if (mode.disableClickBackgroundCloses) {
      return;
    }
    const $background = this.getBackground ? this.getBackground() : this.$el;
    if (this._mousedownBackground && $(e.target).is($background)) {
      this._fileViewer.analytics.send('files.fileviewer-web.closed', {
        actionType: 'element'
      });
      this._fileViewer.close();
    }
  },
  handleResize: function () {
  }
})

export default BaseViewer
