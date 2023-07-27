import Backbone from 'backbone'
import $ from 'jquery'
import _ from 'underscore'
import fileTypes from '../../util/FileType'
import { getCssClass } from '../../util/getCssClass';
import { _templateStore } from '../../core/store/template-store';


let ThumbnailView = Backbone.View.extend({
  className: 'cp-thumbnail',
  tagName: 'li',
  events: {
    'click': 'jumpToFile'
  },
  initialize: function (options) {
    this._fileViewer = options.fileViewer
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(options.panelView, 'renderPanel', this.setSelected);
  },
  onThumbLoadError: function (ev) {
    var el = $(ev.target);
    el.parent().removeClass('has-thumbnail');
    el.remove();
  },
  render: function () {
    var type = this.model.get('type'),
      thumbnailSrc = this.model.get('thumbnail'),
      isImage = fileTypes.isImage(type);

    var generateThumbnail = this._fileViewer.getConfig().generateThumbnail;

    var $thumbnail = $(_templateStore.get('placeholderThumbnail')({
      iconClass: getCssClass(type),
      title: this.model.get('title')
    }));

    this.$el.empty().append($thumbnail);

    if (thumbnailSrc && generateThumbnail) {
      generateThumbnail(this.model).done(function (thumbSrc) {
        $thumbnail.replaceWith(_templateStore.get('thumbnail')({
          iconClass: getCssClass(type),
          thumbnailSrc: thumbSrc,
          title: this.model.get('title')
        }));
        //this.$el.find('img').error(this.onThumbLoadError);
      }.bind(this));
    } else if (isImage || thumbnailSrc) {
      $thumbnail.replaceWith(_templateStore.get('thumbnail')({
        iconClass: getCssClass(type),
        thumbnailSrc: thumbnailSrc || this.model.get('src'),
        title: this.model.get('title')
      }));
     // this.$el.find('img').error(this.onThumbLoadError);
    }

    return this;
  },
  jumpToFile: function (event) {
    event.preventDefault()

    this._fileViewer.showFileWithCID(this.model.cid).then(function () {
      var contentView = this._fileViewer.getView().fileContentView

      var currentView

      if (contentView.isLayerInitialized('content')) {
        currentView = contentView.getLayerForName('content')._viewer

        currentView && contentView.play && currentView.play()
      }
    }.bind(this)).always()
  },
  setSelected: function () {
    var file = this._fileViewer._fileState.getCurrent()
    if (file === this.model) {
      this.$el.addClass('selected')
    } else if (this.$el.hasClass('selected')) {
      this.$el.removeClass('selected')
    }
  }
})

export default ThumbnailView
