// import Backbone from 'backbone'
import BaseViewer from './BaseViewer'

import { getCssClass } from '../../util/getCssClass'

var UnknownFileTypeView = BaseViewer.extend({

  id: 'cp-unknown-file-type-view-wrapper',

  events: {
    'click .download-button': '_handleDownloadButton'
  },

  initialize: function () {
    BaseViewer.prototype.initialize.apply(this, arguments);
  },

  teardown: function () {
    this.off();
    this.remove();
  },

  render: function () {
    this.$el.html(templateStore.get('unknownFileTypeViewer')({
      iconClass: getCssClass(this.model.get('type')),
      src: this.model.get('srcDownload') || this.model.get('src')
    }));

    var fileView = this._fileViewer.getView();

    // kill sidebar view.
    if (fileView.fileSidebarView.isAnyPanelInitialized()) {
      fileView.fileSidebarView.teardownPanel();
    }

    this.trigger('viewerReady');

    return this;
  },

  setupMode: function (mode) {
    if (mode === 'BASE') {
      $('.cp-toolbar-layer').hide();
    }
  },

  _handleDownloadButton: function () {
    this._fileViewer.trigger('fv.download');
    this._triggerAnalytics();
  },

  _triggerAnalytics: function () {
    this._fileViewer.analytics.send('files.fileviewer-web.file.download', {
      actionType: 'cta'
    });
  }

})

export default UnknownFileTypeView
