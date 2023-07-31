import Backbone from 'backbone'
import { _templateStore } from '../store/template-store'

const ArrowLayer = Backbone.View.extend({

  className: 'cp-arrow-layer',

  events: {
    'click #cp-nav-left:not(.disabled)': 'gotoPrevious',
    'click #cp-nav-right:not(.disabled)': 'gotoNext'
  },
  initialize: function (options) {
    this._fileViewer = options.fileViewer;
    this.listenTo(this._fileViewer._fileState.collection, 'add reset', this.checkAndHideNavigation);
    this._visibleArrows = false;
    this._updateElements();
  },

  render: function () {
    this.$el.html(_templateStore.get('fileBodyArrows')()).hide();
    this._updateElements();
    this.checkAndHideNavigation();

    return this;
  },
  gotoNext: function () {
    this._fileViewer.showFileNext().always(
      this._fileViewer.analytics.fn('files.fileviewer-web.next', {
        actionType: 'button',
        mode: this._fileViewer.getMode()
      })
    );
  },
  gotoPrevious: function () {
    this._fileViewer.showFilePrev().always(
      this._fileViewer.analytics.fn('files.fileviewer-web.prev', {
        actionType: 'button',
        mode: this._fileViewer.getMode()
      })
    );
  },
  enableArrow: function ($arrow) {
    $arrow.removeClass('disabled');
    $arrow.removeAttr('original-title');
  },

  disableArrow: function (options) {
    options.arrow.addClass('disabled');
    options.arrow.attr('original-title', options.tooltipText);
    // options.arrow.tooltip({
    //   gravity: options.tooltipGravity
    // });
  },
  showsArrow: function () {
    return this._visibleArrows;
  },
  checkAndHideNavigation: function () {
    if (this._fileViewer._fileState.collection.length <= 1) {
      this._visibleArrows = false;
      return this.$arrows.hide();
    }
    this.$arrows.show();
    this._visibleArrows = true;
    if (this._fileViewer.getConfig().enableListLoop) {
      return;
    }
    if (this._fileViewer.isShowingLastFile()) {
      this.disableArrow({
        arrow: this.$arrowRight,
        tooltipText: '\u60a8\u6b63\u67e5\u770b\u6700\u8fd1\u7684\u6587\u4ef6',
        tooltipGravity: 'e'
      });
    } else if (this._fileViewer.isShowingFirstFile()) {
      this.disableArrow({
        arrow: this.$arrowLeft,
        tooltipText: '\u60a8\u6b63\u67e5\u770b\u6700\u8fd1\u7684\u6587\u4ef6',
        tooltipGravity: 'w'
      });
    }
  },
  _updateElements: function () {
    this.$arrows = this.$el.find('.cp-nav');
    this.$arrowLeft = this.$el.find('#cp-nav-left');
    this.$arrowRight = this.$el.find('#cp-nav-right');
  }
});

export default ArrowLayer
