import { keys } from '../../constant/keyboard';

var baseMode = {
  activateHook: function (mainView) {
    mainView.$el.on('click #cp-file-body', mainView._onClickToBackground.bind(mainView));
    var $arrowLayer = mainView.fileContentView.getLayerForName('arrows').$el;
    $arrowLayer.toggle(this.showsArrowLayer);
  },

  deactivateHook: function (mainView) {
    mainView.$el.off('click #cp-file-body');
  },

  setup: function (mainView, viewer) {
    viewer && viewer.$el.on('click.contentView', viewer._clickedBackgroundToClose.bind(
      viewer));
    $(document).on('keydown.modeKeys', this._handleKeys.bind(mainView));
  },

  teardown: function (mainView, viewer) {
    viewer && viewer.$el.off('click.contentView');
    $(document).off('keydown.modeKeys');
  },

  showsArrowLayer: true,

  _handleKeys: function (e) {
    var contentView, viewer;

    if (this.fileContentView.isLayerInitialized('content')) {
      contentView = this.fileContentView.getLayerForName('content');
      viewer = contentView.getAttachedViewer();
    }

    if (!viewer || !(e.ctrlKey || e.metaKey)) {
      return;
    }

    if (
      e.which === keys.PLUS ||
      e.which === keys.PLUS_NUMPAD ||
      e.which === keys.PLUS_FF) {
      if (viewer.zoomIn) {
        this._fileViewer.analytics.send('files.fileviewer-web.file.zoomin', {
          actionType: 'hotkey'
        });
        viewer.zoomIn();
      }
      e.preventDefault();
    }

    if (
      e.which === keys.MINUS ||
      e.which === keys.MINUS_NUMPAD ||
      e.which === keys.MINUS_FF
    ) {
      if (viewer.zoomOut) {
        this._fileViewer.analytics.send('files.fileviewer-web.file.zoomout', {
          actionType: 'hotkey'
        });
        viewer.zoomOut();
      }
      e.preventDefault();
    }

  },

  toolbarActions: [
    {
      title: '缩小',
      className: 'cp-toolbar-minus',
      predicate: function () {
        return this._viewer && this._viewer.zoomOut;
      },
      handler: function () {
        if (this._viewer && this._viewer.zoomOut) {
          this._fileViewer.analytics.send('files.fileviewer-web.file.zoomout', {
            actionType: 'button'
          });
          this._viewer.zoomOut();
        }
      }
    },
    {
      title: '放大',
      className: 'cp-toolbar-plus',
      predicate: function () {
        return this._viewer && this._viewer.zoomIn;
      },
      handler: function () {
        if (this._viewer && this._viewer.zoomIn) {
          this._fileViewer.analytics.send('files.fileviewer-web.file.zoomin', {
            actionType: 'button'
          });
          this._viewer.zoomIn();
        }
      }
    },
    {
      title: '适合页面',
      className: 'cp-toolbar-fit',
      predicate: function () {
        return this._viewer && this._viewer.zoomFit;
      },
      handler: function () {
        if (this._viewer && this._viewer.zoomFit) {
          this._fileViewer.analytics.send('files.fileviewer-web.file.zoomfit', {
            actionType: 'button'
          });
          this._viewer.zoomFit();
        }
      }
    },
    {
      title: '开始演示',
      className: 'cp-toolbar-presentation',
      predicate: function () {
        debugger
        return this._viewer && this._fileViewer.getConfig().enablePresentationMode;
      },
      handler: function () {
        this._fileViewer.analytics.send(
          'files.fileviewer-web.presentation.enter');
        this._fileViewer.changeMode('PRESENTATION');
      }
    }
  ]
};

export default baseMode
