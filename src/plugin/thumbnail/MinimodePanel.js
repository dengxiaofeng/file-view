import Backbone from 'backbone'
import $ from 'jquery'
import ThumbnailView from './ThumbnailView'
import { _templateStore } from '../../core/store/template-store';


const FileMinimodeView = Backbone.View.extend({
  id: 'cp-footer-minimode',
  initialize: function (options) {
    this.subviews = []
    this._fileViewer = options.fileViewer
    this._panelView = options.panelView
    this.listenTo(this.collection, 'add reset', this.render)
    this.listenTo(this._panelView, 'renderPanel', this._forceChromeRepaint)
    this.listenTo(this._panelView, 'renderPanel', this.scrollToSelected)
    this.$minimode = $(_templateStore.get('minimode')())
    this.$minimode.appendTo(this.$el)
  },
  closeOldSubviews: function () {
    while (this.subviews.length > 0) {
      var view = this.subviews.pop()
      view.remove()
      view.unbind()
    }
  },
  render: function () {
    this.closeOldSubviews()
    this.collection.each(function (model) {
      const view = new ThumbnailView({
        model: model,
        fileViewer: this._fileViewer,
        panelView: this._panelView
      })
      this.subviews.push(view)
      $(view.render().el).appendTo(this.$minimode)
    }.bind(this))
    return this
  },
  scrollToSelected: function () {
    const file = this._fileViewer.getCurrentFile()
    this.subviews.forEach(function (view) {
      if (view.model === file) {
        const topPos = view.$el.get(0).offsetTop - 59


        if (topPos && this.$el.scrollTop !== topPos) {
          this.$el.find('#cp-thumbnails').scrollTop(topPos)
        }
      }
    }.bind(this))
  },
  _forceChromeRepaint: function () {
    const $img = $('#cp-img')
    if ($img.length) {
      let $preview = $img.closest('#cp-image-preview'),
        left = $preview.scrollLeft(),
        top = $preview.scrollTop()

      $img.css('display', 'none').height()
      $img.css('display', 'inline-block')
      $preview.scrollLeft(left)
      $preview.scrollTop(top)
    }
  }
})

export default FileMinimodeView
