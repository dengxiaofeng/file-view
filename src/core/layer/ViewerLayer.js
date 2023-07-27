import Backbone from 'backbone'

var ViewerLayer = Backbone.View.extend({

  className: 'cp-viewer-layer',

  initialize: function (options) {
    this._viewer = null;
  },

  attachViewer: function (viewer) {
    this._viewer = viewer;
    this.$el.prepend(viewer.$el);
  },

  getAttachedViewer: function () {
    return this._viewer;
  },

  teardown: function () {
    if (this._viewer) {
      if (this._viewer.teardown) {
        this._viewer.teardown();
      }
      this._viewer.$el.remove();
    }
  }
});

export default ViewerLayer
