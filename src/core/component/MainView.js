import Backbone from 'backbone'
import _ from 'underscore'
import $ from 'jquery'
import FocusManagerFactory from '../global-api/FocusManager'
import File from './File'
import TitleView from './TitleView'
import DownloadButton from './DownloadButton'
import CloseButton from './CloseButton'
import ViewerLayer from '../layer/ViewerLayer'
import PanelContainerView from './PanelContainerView'
import LayerContainerView from '../layer/LayerContainerView'
import ErrorLayer from '../layer/ErrorLayer'
import WatingLayer from '../layer/WaitingLayer'
import ArrowLayer from '../layer/ArrowLayer'
import ToolbarLayer from '../layer/ToolbarLayer'
import SpinnerLayer from '../layer/SpinnerLayer'
import PasswordLayer from '../layer/PasswordLayer'
import presentationMode from '../../util/presentationMode'
import Commands from '../global-api/Commands'
import baseMode from '../global-api/baseMode'
import { _templateStore } from '../store/template-store'
import { keys, createConditionalKeyHandler } from '../../constant/keyboard'


var rejectWithError = function (msg) {
  return new $.Deferred().reject(
    new Error(msg)
  ).promise();
};


var MainView = Backbone.View.extend({
  attributes: function () {
    return {
      'id': 'cp-container-' + this.model.get('instanceId'),
      'data-embedded': this.model.get('embedded'),
      'role': 'dialog',
      'aria-labelledby': 'cp-title-container'
    }
  },
  initialize: function (params) {
    var options = _.extend({}, params)

    this._fileViewer = options.model.get('fileViewer')

    this._currentFile = null;
    this._viewState = null;

    this._focusManager = new FocusManagerFactory(this.$el).create(this.model.get('embedded'));

    this.fileTitleView = new PanelContainerView({
      fileViewer: this._fileViewer,
      id: 'cp-title-container',
      className: 'aui-item'
    });

    this.fileControlsView = new LayerContainerView({
      fileViewer: this._fileViewer,
      id: 'cp-file-controls',
      className: 'aui-item'
    });


    this.fileMetaView = new LayerContainerView({
      fileViewer: this._fileViewer,
      id: 'cp-meta'
    });


    this.fileSinkView = new PanelContainerView({
      id: 'cp-sink',
      collection: this._fileViewer._fileState.collection,
      fileViewer: this._fileViewer
    });

    this.fileSidebarView = new PanelContainerView({
      id: 'cp-sidebar',
      fileViewer: this._fileViewer,
      collection: this._fileViewer._fileState.collection
    });

    this.fileContentView = new LayerContainerView({
      id: 'cp-file-body',
      fileViewer: this._fileViewer
    });


    this.fileTitleView.addPanelView('title', TitleView);

    this.fileControlsView.addLayerView('downloadButton', DownloadButton, {
      weight: 10,
      predicate: DownloadButton.isDownloadable
    });

    this.fileControlsView.addLayerView('closeButton', CloseButton);
    this.fileContentView.addLayerView('content', ViewerLayer);


    this.fileContentView.addLayerView('error', ErrorLayer);
    this.fileContentView.addLayerView('password', PasswordLayer);
    this.fileContentView.addLayerView('toolbar', ToolbarLayer);
    this.fileContentView.addLayerView('waiting', WatingLayer);
    this.fileContentView.addLayerView('spinner', SpinnerLayer);
    this.fileContentView.addLayerView('arrows', ArrowLayer);

    this.listenTo(this.fileSidebarView, 'togglePanel', this._updateContentWidth);
    this.listenTo(this.fileSinkView, 'togglePanel', this._updateContentHeight);

    this._navigationKeyLockCount = 0;
    this._showFileChain = $.when();

    this._mode = 'BASE';
    this._modes = {
      'BASE': baseMode,
      'PRESENTATION': presentationMode
    };

    this._fixTooltipCleanup();

  },
  show: function () {
    this.$el.show();
    $(this._fileViewer._config.appendTo).addClass('no-scroll');

    this.$el.on('mouseup mousedown', 'a', function (e) {
      this.blur();
    });
    this.$el.on('mouseup mousedown', 'button', function (e) {
      this.blur();
    });

    $(document).on('keydown.disableDefaultKeys', this._disableKeyboardShortcuts.bind(
      this));
    $(document).on('keydown.navKeys', createConditionalKeyHandler(
      this._handleNavigationKeys.bind(this)
    ));

    return this;
  },

  hide: function () {
    this.$el.hide();
    $(this._fileViewer._config.appendTo).removeClass('no-scroll');

    $(document).off('keydown.disableDefaultKeys');
    $(document).off('keydown.navKeys');
    $(document).off('keydown.modeKeys');

    this._deactivateModeHook();
    this._modes[ this._mode ].teardown(this);
    this._teardownAll();

    return this;
  },

  render: function () {

    this.$el.empty().append(_templateStore.get('fileView')());

    this.$header = this.$('#cp-header');
    this.$body = this.$('#cp-body');
    this.$footer = this.$('#cp-footer');

    this.$title = this.fileTitleView.render().$el.appendTo(this.$header);
    this.$controls = this.fileControlsView.render().$el.appendTo(this.$header);

    this.$content = this.fileContentView.render().$el.appendTo(this.$body);
    this.$sidebar = this.fileSidebarView.render().$el.appendTo(this.$body);

    this.$meta = this.fileMetaView.render().$el.appendTo(this.$footer);
    this.$sink = this.fileSinkView.render().$el.appendTo(this.$footer);

    this.$el.on('click', 'a[href="#"]', function (e) {
      e.preventDefault();
    });
    this._focusManager.trapFocus();
    return this;
  },
  showFile: function (file) {

    var needsToRerenderContent = !this.fileContentView.isLayerInitialized('content') ||
      MainView._needsToRerenderContent(this._currentFile, file);

    if (MainView._filesWillRenderTheSame(this._currentFile, file)) {
      return MainView._skipRenderingOf(file);
    }

    var contentView, toolbarView, spinnerView, waitingView, errorView;
    var lookupViewerCommand = new Commands.LookupViewer(file, this._fileViewer._viewerRegistry);

    // allow people to shut down themselves
    this.trigger('cancelShow');

    var fileViewed = new $.Deferred();

    this._showFileChain.pipe(function () {
      var fileHandled = new $.Deferred();

      var p = $.when().pipe(function validateFile() {

        this._currentFile = file;
        this._viewState = null;
        var validationResult;

        if (file) {
          if (needsToRerenderContent) {
            this.trigger('fv.fileChange', file);
            this._reinitializeAllSubviews();
          } else {
            this._reinitializeNonContentSubviews();
          }

          contentView = this.fileContentView.getLayerForName('content');
          toolbarView = this.fileContentView.getLayerForName('toolbar');
          spinnerView = this.fileContentView.getLayerForName('spinner');
          waitingView = this.fileContentView.getLayerForName('waiting');
        } else {
          this._viewState = 'fileNotFound';
          this._reinitializeCoreSubviews();
          validationResult = rejectWithError('文件不存在。');
        }
        errorView = this.fileContentView.getLayerForName('error');
        this._deactivateModeHook();
        this._activateModeHook();

        if (this && this._fileViewer && this._fileViewer.lastFocusId) {
          $('#' + this._fileViewer.lastFocusId).focus();
        }
        return validationResult;
      }.bind(this));

      if (needsToRerenderContent) {

        p = p.pipe(function getConverted() {
          // var isPreviewGenerated = this._fileViewer.getConfig()
          //   .isPreviewGenerated;

          var isPreviewGenerated = this.isPreviewGenerated
          var generatePreview = this.generatePreview


          if (this._fileViewer.supports(file.get('type'))) {
            return $.when(file.get('src'), file.get('type'));
          }

          if (!(isPreviewGenerated && generatePreview)) {
            return $.when(file.get('src'), file.get('type'));
          }
          debugger
          waitingView.showMessage(
            file,
            '您的预览即将出现！',
            '着急吗？您现在可以下载原件。'
          );
          return isPreviewGenerated(this._fileViewer, file).pipe(function (
            isGenerated, source, type, overwrites) {
            if (isGenerated) {
              return $.when(source, type, overwrites);
            }


            return generatePreview(file).pipe(function () {
              debugger
              if (source) {
                return $.when(source, type, overwrites);
              }
            }).always(function () {
              waitingView.clearMessage();
              spinnerView.startSpin();
            })
          });

        }.bind(this))
          .pipe(lookupViewerCommand.execute.bind(lookupViewerCommand))
          .pipe(function createViewer(Viewer, previewSrc, convertedFile) {
            var readyDeferred = new $.Deferred();

            if (Viewer) {
              var view = new Viewer({
                previewSrc: previewSrc,
                model: new File(convertedFile.toJSON()),
                fileViewer: this._fileViewer
              });

              view.once('viewerReady', function () {
                this._viewState = 'success';
                toolbarView.setViewer(view);
                this.setupMode(this._mode);
                readyDeferred.resolve(file);
              }.bind(this));
              view.once('viewerFail', function (err) {
                this._viewState = 'viewerError';
                readyDeferred.reject(err);
                this.setupMode(this._mode);
              }.bind(this));

              contentView.attachViewer(view);

              view.render();

              return readyDeferred.promise();
            }


          }.bind(this))
          .always(function () {
            spinnerView && spinnerView.stopSpin();
            waitingView && waitingView.clearMessage();
          }.bind(this))
          .fail(function (err) {
            fileViewed.reject(err);
            if (err !== 'cancelled') {
              errorView.showErrorMessage(err, file);
            }
          }.bind(this));
      }

      p.done(function () {
        fileViewed.resolve(file);
      }).always(function () {
        fileHandled.resolve();
      }.bind(this));

      return fileHandled.promise();
    }.bind(this));

    return fileViewed.promise();
  },
  isPreviewGenerated: function (fileView, config) {
    var id = config.get('id')
    // console.log(this._fileViewer.getConfig().convertServer)
    var buildURL = fileView.getConfig().buildURL
    var deferred = $.Deferred()
    if (!id) {
      return $.when(true, config.get('src'), config.get('type'))
    }
    debugger
    $.ajax({
      url: fileView.getConfig().convertServer,
      type: 'POST',
      data: {
        urlStr: config.get('src')
      }
    }).done(function (res) {
      if (res.status === 200) {
        debugger
        deferred.resolve(false, buildURL ? buildURL(res.data.url):res.data.url, 'application/pdf')
      }
    }).fail(function (res) {
      deferred.resolve(true, config.get('src'), config.get('type'))
    })
    return deferred.promise()
  },
  generatePreview: function (config) {
    var deferred = $.Deferred()
    deferred.resolve()
    return deferred.promise()
  },
  getCurrentFile: function () {
    return this._currentFile;
  },
  getViewState: function () {
    return this._viewState || 'loading';
  },
  _reinitializeAllSubviews: function () {
    if (!this.fileTitleView.isAnyPanelInitialized()) {
      this.fileTitleView.initializePanel();
    }
    this.fileTitleView.reinitializePanel();

    this.fileControlsView.reinitializeLayers();
    this.fileContentView.reinitializeLayers();
    this.fileSidebarView.reinitializePanel();
    this.fileMetaView.reinitializeLayers();
    this.fileSinkView.reinitializePanel();

    this._updateMetaBannerHeight();
  },

  _reinitializeNonContentSubviews: function () {
    if (!this.fileTitleView.isAnyPanelInitialized()) {
      this.fileTitleView.initializePanel();
    }
    this.fileTitleView.reinitializePanel();

    this.fileControlsView.reinitializeLayers();
    this.fileSidebarView.reinitializePanel();
    this.fileMetaView.reinitializeLayers();
    this.fileSinkView.reinitializePanel();

    this._updateMetaBannerHeight();
  },
  _reinitializeCoreSubviews: function () {
    this._teardownAll();

    this.fileControlsView.initializeLayerSubset([ 'closeButton' ]);
    this.fileContentView.initializeLayerSubset([ 'arrows', 'error' ]);
  },

  _teardownAll: function () {
    this.fileTitleView.teardownPanel();
    this.fileSidebarView.teardownPanel();
    this.fileSinkView.teardownPanel();
    this.fileMetaView.teardownLayers();
    this.fileControlsView.teardownLayers();
    this.fileContentView.teardownLayers();
    this._focusManager.releaseFocus();
  },
  _handleNavigationKeys: function (e) {
    var numFiles = this._fileViewer._files.length;
    var usedModifierKey = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;

    if (e.which === keys.ESCAPE && !this.isNavigationLocked()) {
      e.preventDefault();
      this._fileViewer.analytics.send('files.fileviewer-web.closed', {
        actionType: 'hotkey'
      });
      this._fileViewer.close();
    } else if (
      !usedModifierKey &&
      !this.isNavigationLocked() &&
      numFiles > 1 &&
      e.which === keys.ARROW_RIGHT
    ) {
      e.preventDefault();
      this._fileViewer.showFileNext().always(
        this._fileViewer.analytics.fn('files.fileviewer-web.next', {
          actionType: 'hotkey',
          mode: this._fileViewer.getMode()
        })
      );
    } else if (
      !usedModifierKey &&
      !this.isNavigationLocked() &&
      numFiles > 1 &&
      e.which === keys.ARROW_LEFT
    ) {
      e.preventDefault();
      this._fileViewer.showFilePrev().always(
        this._fileViewer.analytics.fn('files.fileviewer-web.prev', {
          actionType: 'hotkey',
          mode: this._fileViewer.getMode()
        })
      );
    }
  },
  lockNavigationKeys: function () {
    this._navigationKeyLockCount += 1;
  },
  unlockNavigationKeys: function () {
    if (this._navigationKeyLockCount >= 1) {
      this._navigationKeyLockCount -= 1;
    }
  },
  isNavigationLocked: function () {
    return this._navigationKeyLockCount !== 0;
  },

  _disableKeyboardShortcuts: function (e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.which) {
        case keys.F:
        case keys.G:
          e.preventDefault();
          break;
        case keys.P:
          e.preventDefault();
          break;
      }
    }
  },
  _onClickToBackground: function (e) {
    var mode = this._fileViewer._view._modes[ this._fileViewer._view._mode ];
    if (mode.disableClickBackgroundCloses) {
      return;
    }
    var backgroundLayers = [
      'cp-error-layer',
      'cp-waiting-layer',
      'cp-password-layer'
    ];
    if (backgroundLayers.indexOf(e.target.className) >= 0) {
      this._fileViewer.analytics.send('files.fileviewer-web.closed', {
        actionType: 'element'
      });
      this._fileViewer.close();
    }
  },

  _updateContentWidth: function (panelId, isExpanded) {
    this.$content && this.$content.toggleClass('narrow', isExpanded);
    this._resizeActiveViewer();
  },

  _updateContentHeight: function (panelId, isExpanded) {
    this.$content && this.$content.toggleClass('short', isExpanded);
    this.$sidebar && this.$sidebar.toggleClass('short', isExpanded);
    this._resizeActiveViewer();
  },

  _updateMetaBannerHeight: function () {
    var showsMetaView = this.fileMetaView.countInitializedLayers() > 0;
    this.fileContentView.$el.toggleClass('meta-banner', showsMetaView);
    this.fileSidebarView.$el.toggleClass('meta-banner', showsMetaView);
  },

  _resizeActiveViewer: function () {
    if (this.fileContentView.isLayerInitialized('content')) {
      var contentView = this.fileContentView.getLayerForName('content');
      var viewer = contentView.getAttachedViewer();
      if (viewer) {
        viewer.handleResize();
      }
    }
  },

  _fixTooltipCleanup: function () {
    var removeAllTooltips = function () {
      $('.tipsy').remove();
    };
    this._fileViewer.on('fv.changeFile', removeAllTooltips);
    this._fileViewer.on('fv.close', removeAllTooltips);
  },

  getMode: function () {
    return this._mode || '';
  },
  isInMode: function (mode) {
    return this._mode === mode;
  },

  setupMode: function (mode) {
    var toolbar = this.fileContentView.getLayerForName('toolbar');
    var viewer = toolbar._viewer;
    var $arrowLayer = this.fileContentView.getLayerForName('arrows').$el;

    var lastMode = this._mode;
    var isModeChanged = (lastMode !== mode);

    var modeObj = this._modes[ mode ];
    var lastModeObj = this._modes[ lastMode ];

    if (isModeChanged) {
      this._deactivateModeHook();
      this._mode = mode;
      this._activateModeHook();
    } else {
      this._mode = mode;
    }

    $(document).off('keydown.modeKeys');
    lastModeObj.teardown(this, viewer, isModeChanged);
    modeObj.setup(this, viewer);

    $arrowLayer.toggle(modeObj.showsArrowLayer);

    toolbar.setActions(modeObj.toolbarActions);
    toolbar.render();
    if (viewer && viewer.setupMode) {
      viewer.setupMode(mode, isModeChanged);
    }
  },

  _activateModeHook: function () {
    var mode = this._modes[ this._mode ];
    if (mode.activateHook) {
      mode.activateHook(this);
    }
  },

  _deactivateModeHook: function () {
    var mode = this._modes[ this._mode ];
    if (mode.deactivateHook) {
      mode.deactivateHook(this);
    }
  },
  updatePaginationButtons: function () {
    if (this.isInMode('PRESENTATION')) {
      var toolbar = this.fileContentView.getLayerForName('toolbar');
      if (!toolbar._viewer) {
        return;
      }

      var $toolbarPrevPage = toolbar.$el.find('.cp-toolbar-prev-page');
      var $toolbarNextPage = toolbar.$el.find('.cp-toolbar-next-page');

      $toolbarPrevPage.toggleClass('inactive', false);
      $toolbarNextPage.toggleClass('inactive', false);

      if (!(toolbar._viewer.hasPreviousPage() || toolbar._viewer.hasNextPage())) {
        $toolbarPrevPage.hide();
        $toolbarNextPage.hide();
      } else if (!toolbar._viewer.hasPreviousPage()) {
        $toolbarPrevPage.toggleClass('inactive', true);
      } else if (!toolbar._viewer.hasNextPage()) {
        $toolbarNextPage.toggleClass('inactive', true);
      }
    }
  }
})


MainView._filesWillRenderTheSame = function (fileA, fileB) {
  if (!fileA || !fileB) {
    return false;
  }
  return _.isEqual(fileA.attributes, fileB.attributes);
};

MainView._needsToRerenderContent = function (fileA, fileB) {
  if (!fileA || !fileB) {
    return true;
  }
  var didTypeChange = fileA.get('type') !== fileB.get('type');
  var didSrcChange = fileA.get('src') !== fileB.get('src');
  var didThumbChange = fileA.get('thumbnail') !== fileB.get('thumbnail');
  return didTypeChange || didSrcChange || didThumbChange;
};

MainView._skipRenderingOf = function (file) {
  return $.when(file);
};


export default MainView
