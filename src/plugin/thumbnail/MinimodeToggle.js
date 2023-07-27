import Backbone from 'backbone'
import { _templateStore } from '../../core/store/template-store';


var MinimodeToggle = Backbone.View.extend({
  events: {
    'click #cp-files-label': '_toggleMinimode'
  },
  initialize: function (options) {
    this._fileViewer = options.fileViewer
    this._sinkView = this._fileViewer.getView().fileSinkView
  },
  render: function () {
    this.$el.html(_templateStore.get('minimodeBanner')())
    this._setShowAllFilesVisible()
    return this
  },
  _toggleMinimode: function (event) {
    event.preventDefault()
    var analytics = this._fileViewer.analytics

    if(this._sinkView.isPanelInitialized('minimode')){
      this._sinkView.teardownPanel('minimode')
      analytics.send('files.fileviewer-web.minimode.closed')
    }else{
      this._sinkView.initializePanel('minimode');
      analytics.send('files.fileviewer-web.minimode.opened');
    }
    this._setShowAllFilesVisible();
  },
  _setShowAllFilesVisible: function () {
    var visible = this._sinkView.isPanelInitialized('minimode')
    this.$('.cp-files-collapser.up').toggleClass('hidden', visible);
    this.$('.cp-files-collapser.down').toggleClass('hidden', !visible);
  }
}, {
  predicate: function (fileViewer) {
    return fileViewer._fileState.collection.length > 1;
  }
})

export default MinimodeToggle
