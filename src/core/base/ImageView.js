
import _ from 'underscore'
import BaseViewer from '../component/BaseViewer'
import {_templateStore} from '../store/template-store';

const ImageView = BaseViewer.extend({
  id: 'cp-image-preview',
  tagName: 'div',
  initialize: function () {
    BaseViewer.prototype.initialize.apply(this, arguments);
    this.bindPanEvents();
    this.PIXELATE_THRESHOLD = 2;
    this.MIN_HEIGHT = 100;
    this.ZOOM_IN_FACTOR = 1.25;
    this.ZOOM_OUT_FACTOR = 0.80;
    this._isFitWidth = false;
    this._isFitHeight = false;
  },
  renderAnnotations: function (PinsView) {
    const current = this._fileViewer.getCurrentFile();
    const annotations = current.get('annotations');
    if (current && PinsView) {
      this.pinsView = new PinsView({
        fileViewer: this._fileViewer,
        container: this.$el.find('.cp-image-container'),
        collection: annotations
      });
      this.pinsView.render();
    }

    annotations.on('selected', function (item) {
      let $pin, positionTop, positionLeft;
      if (!item) {
        return;
      }

      $pin = this.$el.find('span.hc-active-annotation.selected');
      if (!$pin.length) {
        return;
      }

      positionTop = $pin.position().top - (this.$el.height() / 2);
      positionLeft = $pin.position().left - (this.$el.width() / 2);

      this.$el.animate({
        'scrollTop': positionTop,
        'scrollLeft': positionLeft
      });

    }.bind(this));
  },
  bindPanEvents: function () {
    let previous = {
        x: 0,
        y: 0
      },
      view = this;

    const scroll = function (e) {
      const $el = view.$el;
      $el.scrollLeft($el.scrollLeft() + previous.x - e.clientX);
      $el.scrollTop($el.scrollTop() + previous.y - e.clientY);
      previous = {
        x: e.clientX,
        y: e.clientY
      };
      e.preventDefault();
    };

    const unpan = function (e) {
      view.$el.off('mousemove', '#cp-img', scroll);
      view.$image.removeClass('panning');
      e.preventDefault();
    };

    const pan = function (e) {
      $(window).one('mouseup', unpan);
      view.$el.on('mousemove', '#cp-img', scroll);
      view.$image.addClass('panning');
      previous = {
        x: e.clientX,
        y: e.clientY
      };
      e.preventDefault();
    };

    this.$el.on('mousedown', '#cp-img', pan);
  },
  handleResize: function () {
    this._forceRescale();
  },
  _forceRescale: function () {
    if (this._isFitHeight) {
      this.zoomHeight();
    } else if (this._isFitWidth) {
      this.zoomWidth();
    }
  },
  _fixContainerSize: function () {
    const $container = this.$el.find('.hc-image-container');
    const $image = this.$el.find('#cp-img');
    $container.width($image.width());
    $container.height($image.height());
  },
  _isImageBiggerThanViewport: function () {
    return this._isImageWiderThanViewport() || this._isImageHigherThanViewport();
  },
  _isImageWiderThanViewport: function () {
    const viewportWidth = this.$el.width();
    return this.imageWidth > viewportWidth;
  },
  _isImageHigherThanViewport: function () {
    const viewportHeight = this.$el.height();
    return this.imageHeight > viewportHeight;
  },

  _isZoomedToPageFit: function () {
    return this.$el.width() === this.$image.width() || this.$el.height() === this.$image.height();
  },

  _stopFit: function () {
    this._isFitWidth = false;
    this._isFitHeight = false;
  },

  _showScaleInfo: function (scale) {
    if (this._rescaleForFullScreen) {
      return;
    }
    const scalePercentage = Math.round(parseInt(scale * 100, 10));
    const $scaleInfo = this.$el.find('.cp-scale-info');
    $scaleInfo.text(scalePercentage + '%');
    $scaleInfo
      .stop(true, true)
      .fadeIn(50)
      .delay(400)
      .fadeOut(100);
  },

  zoomIn: function () {
    const scaleFactor = (this.$image.width() / this.imageWidth) * this.ZOOM_IN_FACTOR;
    this._stopFit();
    this.changeScale(scaleFactor);
  },

  zoomOut: function () {
    const scaleFactor = (this.$image.width() / this.imageWidth) * this.ZOOM_OUT_FACTOR;
    this._stopFit();
    this.changeScale(scaleFactor);
  },


  zoomFit: function () {
    if (this._isZoomedToPageFit()) {
      this.zoomActual();
    } else {
      this.zoomAuto(true);
    }
  },


  zoomAuto: function (force) {
    if (this._isImageBiggerThanViewport() || force) {
      this._zoomPageFit();
    } else {
      this.zoomActual();
    }
  },

  _zoomPageFit: function () {
    const viewportWidth = this.$el.width();
    const viewportHeight = this.$el.height();

    if ((viewportWidth / this.imageWidth) > (viewportHeight / this.imageHeight)) {
      this.zoomHeight();
    } else {
      this.zoomWidth();
    }
  },

  zoomWidth: function () {
    const viewportWidth = this.$el.width();
    const scaleFactor = viewportWidth / this.imageWidth;
    this.changeScale(scaleFactor);
    this._stopFit();
    this._isFitWidth = true;
  },

  zoomHeight: function () {
    const viewportHeight = this.$el.height();
    const scaleFactor = viewportHeight / this.imageHeight;
    this.changeScale(scaleFactor);
    this._stopFit();
    this._isFitHeight = true;
  },

  zoomActual: function () {
    this._stopFit();
    this.changeScale(1);
  },


  changeScale: function (scale) {
    const viewportWidth = this.$el.width();
    const viewportHeight = this.$el.height();

    const oldWidth = this.$image.width();
    const oldHeight = this.$image.height();
    const containerPosition = this.$el.find('.cp-image-container').position();

    const oldPixelCentreWidth = (viewportWidth / 2) + Math.abs(containerPosition.left);
    const oldPixelCentreHeight = (viewportHeight / 2) + Math.abs(containerPosition.top);

    this.$image.css('width', this.imageWidth * scale);
    this.$image.css('height', this.imageHeight * scale);

    const newPixelCentreWidth = (oldPixelCentreWidth / oldWidth) * this.$image.width();
    const newPixelCentreHeight = (oldPixelCentreHeight / oldHeight) * this.$image.height();

    this.$el.scrollLeft(newPixelCentreWidth - (viewportWidth / 2));
    this.$el.scrollTop(newPixelCentreHeight - (viewportHeight / 2));

    this.makePannable();
    this.pixelateIfScaleOverThreshold(scale);
    this._fixContainerSize();
    this._showScaleInfo(scale);
  },

  pixelateIfScaleOverThreshold: function (scale) {
    this.$image.toggleClass(
      'pixelate',
      scale >= this.PIXELATE_THRESHOLD
    );
  },

  makePannable: function () {
    if ((this.$el.width() < this.$image.width()) || (this.$el.height() < this.$image
      .height())) {
      this.$image.addClass('pannable');
    } else {
      this.$image.removeClass('pannable');
    }
  },

  teardown: function () {
    BaseViewer.prototype.teardown.apply(this);
    $(window).off('resize.cp-repaint');
    this.pinsView && this.pinsView.remove().off();
  },

  getBackground: function () {
    return this.$el.add('.cp-image-container');
  },

  render: function () {
    this.$el.html(_templateStore.get('previewBody')());

    this.addImage();

    $(window).on('resize.cp-repaint', _.throttle(this._forceRescale.bind(this), 250));

    return this;
  },

  addImage: function () {
    const $img = $('<img/>')
      .attr('id', 'cp-img')
      .attr('src', this._previewSrc)
      .attr('alt', this.model.get('title'));
    $img.off('load');

    $img.on('load', _.partial(this.scaleAndAppendImage, this));
    $img.on('load', function () {
      this.trigger('viewerReady');
    }.bind(this));
    $img.on('error', function () {
      const err = new Error('Image failed loading');
      err.title = "\u54ce\u54df\uff01\u6211\u4eec\u4e0d\u80fd\u52a0\u8f7d\u56fe\u50cf\u3002";
      err.description = this.model.get('src');
      err.icon = 'cp-image-icon';
      this.trigger('viewerFail', err);
    }.bind(this));

    $img.on('click', function () {
      document.activeElement.blur();
    });
  },

  scaleAndAppendImage: function (view) {
    const $image = $(this);

    view.imageHeight = this.height;
    view.imageWidth = this.width;
    view.$image = $image;

    $image.css('display', 'none');

    const $imageContainer = view.$el.find('.cp-image-container');
    $imageContainer.append(view.$image);
    $imageContainer.addClass('cp-annotatable');
    view.zoomAuto();
    view.$image.fadeIn(200);

    view.trigger('cp.imageAppended');
  },

  setupMode: function (mode, isModeChanged) {
    if (isModeChanged) {
      clearInterval(this._fullScreenInProgress);
      this.scaleGraduallyToFit();
    }
  },
  scaleGraduallyToFit: function () {
    let times = 0;
    this._rescaleForFullScreen = true;
    this._fullScreenInProgress = setInterval(function () {
      times++;
      if (times === 11) {
        clearInterval(this._fullScreenInProgress);
        this._rescaleForFullScreen = false;
        this.zoomAuto();
      }
      this.zoomAuto();
    }.bind(this), 100);
  }
})

export default ImageView

