import $ from 'jquery'

const requestFullscreen = function () {
  const fullscreenContainer = $('#cp-file-body')[ 0 ];

  if (fullscreenContainer.requestFullscreen) {
    fullscreenContainer.requestFullscreen();
  } else if (fullscreenContainer.mozRequestFullScreen) {
    fullscreenContainer.mozRequestFullScreen();
  } else if (fullscreenContainer.webkitRequestFullScreen) {
    fullscreenContainer.webkitRequestFullScreen();
  } else if (fullscreenContainer.msRequestFullscreen) {
    fullscreenContainer.msRequestFullscreen();
  }
};

const cancelFullscreen = function () {
  if (document.cancelFullscreen) {
    document.cancelFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

const isFullscreen = function () {
  return (document.fullscreenElement ||
    document.mozFullScreen ||
    document.webkitIsFullScreen ||
    document.msFullscreenElement);
};


const onFullscreenChange = function (e) {
  if (!isFullscreen() && !this.isInMode('BASE')) {
    this._fileViewer.analytics.send('files.fileviewer-web.presentation.exit', {
      actionType: 'hotkey'
    });
    this._fileViewer.changeMode('BASE');
  }
};

const presentationMode = {

  activateHook: function (mainView) {
    $(document).on(
      'fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange',
      onFullscreenChange.bind(mainView));
    const $arrowLayer = mainView.fileContentView.getLayerForName('arrows').$el;
    $arrowLayer.toggle(this.showsArrowLayer);
  },

  deactivateHook: function (mainView) {
    $(document).off(
      'fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange',
      onFullscreenChange.bind(mainView));
  },

  setup: function (mainView, viewer) {
    this._originalScrollTop = $('body').scrollTop();
    $('#cp-file-body').addClass('presentation');
    $(document).on('keydown.modeKeys', this._handleKeys.bind(mainView));

    if (!isFullscreen()) {
      requestFullscreen();
    }
  },

  teardown: function (mainView, viewer, isModeChanged) {
    $('#cp-file-body').removeClass('presentation');
    $(document).off('keydown.modeKeys');

    if (isModeChanged && isFullscreen()) {
      cancelFullscreen();
    }
    $('body').scrollTop(this._originalScrollTop);
  },

  disableClickBackgroundCloses: true,

  showsArrowLayer: false,

  _handleKeys: function (e) {
    e.preventDefault();
    let contentView, viewer;

    if (this.fileContentView.isLayerInitialized('content')) {
      contentView = this.fileContentView.getLayerForName('content');
      viewer = contentView.getAttachedViewer();
    }
    if (!viewer) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    switch (e.which) {
      case keyboard.keys.ARROW_UP:
        if (viewer.goToPreviousPage) {
          this._fileViewer.analytics.send(
            'files.fileviewer-web.presentation.pageprev', {
              actionType: 'hotkey'
            });
          viewer.goToPreviousPage();
          this.updatePaginationButtons();
        }
        return;
      case keyboard.keys.ARROW_DOWN:
        if (viewer.goToNextPage) {
          this._fileViewer.analytics.send(
            'files.fileviewer-web.presentation.pagenext', {
              actionType: 'hotkey'
            });
          viewer.goToNextPage();
          this.updatePaginationButtons();
        }
        return;
    }

  },

  toolbarActions: [
    {
      title: "上一页",
      className: 'cp-toolbar-prev-page',
      predicate: function () {
        return this._viewer && this._viewer.goToPreviousPage;
      },
      handler: function () {
        if (this._viewer && this._viewer.goToPreviousPage) {
          this._fileViewer.analytics.send(
            'files.fileviewer-web.presentation.pageprev', {
              actionType: 'button'
            });
          this._viewer.goToPreviousPage();
          this._fileViewer.getView().updatePaginationButtons();
        }
      }
    },
    {
      title: "退出演示",
      className: 'cp-toolbar-presentation-exit',
      handler: function () {
        this._fileViewer.analytics.send(
          'files.fileviewer-web.presentation.exit', {
            actionType: 'button'
          });
        this._fileViewer.changeMode('BASE');
      }
    },
    {
      title: "下一页",
      className: 'cp-toolbar-next-page',
      predicate: function () {
        return this._viewer && this._viewer.goToNextPage;
      },
      handler: function () {
        if (this._viewer && this._viewer.goToNextPage) {
          this._fileViewer.analytics.send(
            'files.fileviewer-web.presentation.pagenext', {
              actionType: 'button'
            });
          this._viewer.goToNextPage();
          this._fileViewer.getView().updatePaginationButtons();
        }
      }
    }
  ]
};

export default presentationMode
