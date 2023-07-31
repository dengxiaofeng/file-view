import Backbone from 'backbone'
import fileTypes from '../../util/FileType'
import { getCssClass } from '../../util/getCssClass'
import { _templateStore } from '../store/template-store'

const ThumbnailView = Backbone.View.extend({
  className: 'cp-thumbnail',
  tagName: 'li',
  events: {
    'click': 'jumpToFile'
  },
  initialize: function (options) {
    this._fileViewer = options.fileViewer
    this.listenTo(this.mode, 'change', this.render)
    this.listenTo(options.panelView, 'renderPanel', this.setSelected)
  },
  jumpToFile: function (event) {
    event.preventDefault()
    this._fileViewer.showFileWithCID(this.model.cid).then(function () {
      const contentView = this._fileViewer.getView().fileContentView
      let currentView;
      if (contentView.isLayerInitialized('content')) {
        currentView = contentView.getLayerForName('content')._viewer
        currentView && currentView.play && currentView.play()
      }
    }.bind(this)).always(
      this._fileViewer.analytics.fn('files.fileviewer-web.minimode.thumbnail.clicked')
    )
  },
  setSelected: function () {
    const file = this._fileViewer._fileState.getCurrent();
    if (file === this.model) {
      this.$el.addClass('selected');
    } else if (this.$el.hasClass('selected')) {
      this.$el.removeClass('selected');
    }
  },
  onThumbLoadError: function (ev) {
    const el = $(ev.target);
    el.parent().removeClass('has-thumbnail');
    el.remove();
  },
  render: function () {
    const type = this.model.get('type'), thumbnailSrc = this.model.get('thumbnail'), isImage = fileTypes.isImage(type);

    const generateThumbnail = this._fileViewer.getConfig().generateThumbnail;

    const $thumbnail = $(_templateStore.get('placeholderThumbnail')({
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
        this.$el.find('img').error(this.onThumbLoadError);
      }.bind(this));
    } else if (isImage || thumbnailSrc) {
      $thumbnail.replaceWith(_templateStore.get('thumbnail')({
        iconClass: getCssClass(type),
        thumbnailSrc: thumbnailSrc || this.model.get('src'),
        title: this.model.get('title')
      }));
      this.$el.find('img').error(this.onThumbLoadError);
    }

    return this;
  }
})

export default ThumbnailView
