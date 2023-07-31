import _ from 'underscore'
import Backbone from 'backbone'
import $ from 'jquery';
import ConstantsDictionary from '../global-api/constants-dictionary'
import MainView from './MainView'
import FileState from './FileState'
import Files from './Files'
import File from './File'
import ViewerRegistry from '../global-api/ViewerRegistry'
import fileTypes from '../../util/FileType'
import defaultsConfig from '../../defaultConfig'
import Storage from '../../util/storage'
import imageViewProvider from '../provider/image-view-provider'
import pdfViewProvider from '../provider/pdf-view-provider'
import videoViewProvider from '../provider/video-view-provider'
import excelViewProvider from '../provider/excel-view-provider'
import wordViewProvider from '../provider/word-view-provider'
import unknownFileTypeViewProvider from '../provider/unknown-file-type-view-provider'
import Analytics from '../global-api/Analytics'
import { djb2 } from '../../util/util';
import { moduleStore } from '../store/module-store';
import { _templateStore } from '../store/template-store'
import templateBackend from '../store/template-backend'
import moduleBackend from '../store/module-backend'

const _modules = {}
Backbone.$=$
const FileViewer = function (config) {
  config = _.defaults(config || {}, defaultsConfig);
  config.appendTo = config.appendTo || $('body');
  this.Templates = {}
  FileViewer._instanceCount += 1;
  config.instanceId = FileViewer._instanceCount;
  _templateStore.useBackend(config.templateBackend || templateBackend(this))
  moduleStore.useBackend(config.moduleBackend || moduleBackend(this))

  this._config = config;
  this._properties = new Backbone.Model();
  this._fileState = new FileState();
  this._viewerRegistry = new ViewerRegistry();
  this._analytics = new Analytics(config.analyticsBackend, this, djb2);
  if (config.viewers.indexOf('image') !== -1) {
    this._viewerRegistry.register(fileTypes.isImageBrowserSupported, imageViewProvider, 0);
  }


  if (config.viewers.indexOf('document') !== -1) {
    this._viewerRegistry.register(fileTypes.isPDF, pdfViewProvider, 0);
    this._viewerRegistry.register(fileTypes.isSpreadsheet, excelViewProvider, 0);
    this._viewerRegistry.register(fileTypes.isWordProcessing, wordViewProvider, 0);
  }
  if (config.viewers.indexOf('video') !== -1) {
    this._viewerRegistry.register(fileTypes.isMultimediaBrowserSupported, videoViewProvider, 0);
  }


  this._viewerRegistry.register(fileTypes.matchAll, unknownFileTypeViewProvider, 100);


  this._files = new Files(config.files || [], {
    service: config.commentService
  });
  this._fileState.setCollection(this._files);
  // Backbone.$ = $
  this._view = new MainView({
    model: new Backbone.Model({
      fileViewer: this,
      instanceId: config.instanceId,
      embedded: config.embedded
    })
  });

  this._isOpen = false;

  this._storage = new Storage(this.getConfig().customStorage, 'fileViewer.');

  FileViewer._plugins.list().map(function (definition) {
    return definition.value;
  }).forEach(function (plugin) {
    plugin(this);
  }, this);
}


FileViewer.Templates = {
  fileView: function (opt_data, opt_ignored) {
    return '<div id="cp-header" class="aui-group"></div><div id="cp-body" class="aui-group"></div><div id="cp-footer"></div>';
  },
  titleContainer: function (opt_data, opt_ignored) {
    return '<span class="' + opt_data.iconClass + ' size-24 cp-file-icon"></span>' +
      opt_data.title
  },
  controlDownloadButton: function (opt_data, opt_ignored) {
    return '<a role="button" tabindex="55" id="cp-control-panel-download" href="' + opt_data.src +
      '" title="下载" class="cp-icon" target="_blank" download original-title="下载">下载</a>';
  },
  controlCloseButton: function (opt_data, opt_ignored) {
    return '<button role="button" tabindex="60" id="cp-control-panel-close" href="#" title="关闭" class="cp-icon">关闭</button>';
  },
  moreButton: function (opt_data, opt_ignored) {
    return '<button role="button" tabindex="50" id="cp-control-panel-more" aria-owns="cp-more-menu" aria-haspopup="true" class="cp-icon aui-dropdown2-trigger aui-dropdown2-trigger-arrowless" title="更多"> 更多</button><div id="cp-more-menu" class="aui-dropdown2 aui-style-default" data-fv-allow-focus><ul class="aui-list-truncate"></ul></div>';
  },
  moreMenuItem: function (opt_data, opt_ignored) {
    return '<li><a href="#">选择</a></li>';
  },
  fileComments: function (opt_data, opt_ignored) {
    return '<div id="cp-comments"/>';
  },
  fileBodySpinner: function (opt_data, opt_ignored) {
    return '<div class="cp-spinner"></div>';
  },
  fileBodyArrows: function (opt_data, opt_ignored) {
    return '<button class="cp-nav" id="cp-nav-left" tabindex=20 disabled-title="您正查看最近的文件">您正查看最近的文件 </button><button class="cp-nav" id="cp-nav-right" tabindex=20  disabled-title="您正查看最近的文件">您正查看最近的文件</button>';
  },
  unknownFileTypeViewer: function (opt_data, opt_ignored) {
    return '<div id="cp-unknown-file-type-view"><span class="file-icon size-96 ' + opt_data.iconClass +
      '"></span><p class="title">哎哟！我们不能预览此文件类型<br>哎哟！我们不能预览此文件类型。</p><a class="aui-button download-button" href="' + opt_data.src +
      '" target="_blank" download><span class="aui-icon aui-icon-small icon-download"></span>下载</a></div><span class="cp-baseline-extension"></span>';
  },
  displayError: function (opt_data, opt_ignored) {
    return '<div id="cp-error-message">' + ((opt_data.icon) ? '<span class="file-icon size-96 ' +
      opt_data.icon + '"></span>' : '<span class="file-icon size-96 cp-unknown-file-type-icon"></span>') +
      '<p class="title">' + opt_data.title + '</p><p class="message">' +
      opt_data.message + '</p>' + ((opt_data.srcBrowser) ? '<a class="aui-button download-button" href="' +
        opt_data.srcBrowser +
        '" target="_blank"><span class="aui-icon aui-icon-small icon-download"></span>在浏览器中打开</a>' : '') + ((opt_data.srcDownload) ?
        '<a class="aui-button download-button" href="' + opt_data.srcDownload +
        '" target="_blank" download><span class="aui-icon aui-icon-small icon-download"></span>下载</a>' : '') + '</div><span class="cp-baseline-extension"></span>';
  },
  waitingMessage: function (opt_data, opt_ignored) {
    return '<div id="cp-waiting-message"><span class="file-icon size-96 cp-waiting-message-spinner"></span><p class="title">' + opt_data.header + '</p><p class="message">' + opt_data.message +
      '</p><a class="cp-button" href="' + opt_data.src + '" target="_blank" download><span class="cp-button-icon icon-download"></span>下载</a></div><span class="cp-baseline-extension"></span>';
  },
  toolbar: function (opt_data, opt_ignored) {
    var output = '<div class="cp-toolbar">';
    var actionList55 = opt_data.actions;
    var actionListLen55 = actionList55.length;
    for (var actionIndex55 = 0; actionIndex55 < actionListLen55; actionIndex55++) {
      var actionData55 = actionList55[ actionIndex55 ];
      output += '<button tabindex="' + actionIndex55 + 10 + '" class="' + actionData55.className + ' cp-icon" title="' + actionData55.title + '">' + actionData55.title + '</button>'
    }
    output += '</div>';
    return output;
  },
  previewBody: function (opt_data, opt_ignored) {
    return '<div class="cp-scale-info" /><div class="cp-image-container" /><span class="cp-baseline-extension"></span>';
  },
  PDFViewer: {
    preview: function (opt_data, opt_ignored) {
      return '<div class="pdf-spinner"></div><div id="viewer" tabindex="0"></div><div id="outerContainer"></div>';
    }
  },
  passwordLayer: function (opt_data, opt_ignored) {
    return '<div id="cp-preview-password"><span class="cp-password-lock-icon"></span><div class="cp-password-base"><p class="title">' + opt_data.prompt + '</p><input tabindex="5" type="password" name="password" class="cp-password-input"  autocomplete="off"><button tabindex="10" class="aui-button cp-password-button">确定</button></div><div class="cp-password-fullscreen"><p class="title"></p><p class="message"></p></div></div><span class="cp-baseline-extension"></span>';
  },
  minimodeBanner: function (opt_data, opt_igored) {
    return '<div id="cp-info"><a tabindex="100" href="#" id="cp-files-label" aria-label="显示所有文件"><span class="cp-files-collapser up">显示所有文件</span><span class="cp-files-collapser down hidden">隐藏文件</span></a></div>';
  },
  minimode: function (opt_data, opt_igored) {
    return '<ol id="cp-thumbnails"/>';
  },
  thumbnail: function (opt_data, opt_ignored) {
    return '<figure role="group" class="cp-thumbnail-group"><div class="cp-thumbnail-img">' +
      '<a href="#" class="cp-thumbnail-img-container size-48 ' +
      opt_data.iconClass + ' has-thumbnail"><img src="' + opt_data.thumbnailSrc +
      '" alt="' + opt_data.title +
      '" /></a></div><figcaption class="cp-thumbnail-title" aria-label="' + opt_data.title +
      '">' + opt_data.title + '</figcaption></figure>';
  },
  placeholderThumbnail: function (opt_data, opt_ignored) {
    return '<figure role="group" class="cp-thumbnail-group"><div class="cp-thumbnail-img"><a href="#" class="cp-thumbnail-img-container size-48 ' +
      opt_data.iconClass + '"></a></div><figcaption class="cp-thumbnail-title" aria-label="' +
      opt_data.title + '">' + opt_data.title + '</figcaption></figure>';
  },
  playerBody: function (opt_data, opt_ignored) {
    return '<div class="cp-video-container">' + ((opt_data.kind == 'audio') ? '<audio id="cp-video-player" class="video-js vjs-atlassian-skin" poster="' + opt_data.poster + '"><source src="' + opt_data.src + '" type="' + opt_data.type + '" /></audio>' : '<video id="cp-video-player" class="video-js vjs-atlassian-skin" poster="' + opt_data.poster + '"><source src="' + opt_data.src + '" type="' + opt_data.type + '" /></video>') + '</div><span class="cp-baseline-extension"></span>';
  },
  progressTooltip: function (opt_data, opt_ignored) {
    return '<div id=\'vjs-tip\'><div id=\'vjs-tip-arrow\'></div><div id=\'vjs-tip-inner\'></div></div>';
  },
  customControlBarItem: function (opt_data, opt_ignored) {
    return '<div class="vjs-control-content"><span class="vjs-control-text">' + opt_data.descr + '</span></div>';
  }
}


FileViewer._instanceCount = 0;

FileViewer._modules = {};

FileViewer._plugins = new ConstantsDictionary();

FileViewer.VERSION = '0.0.1';

FileViewer.define = {};

FileViewer.require = {};

FileViewer.registerPlugin = function (name, plugin) {
  this._plugins.define(name, plugin);
};


FileViewer.isPluginEnabled = function (name) {
  return this._plugins.isDefined(name);
};

FileViewer.getPlugin = function (name) {
  return this._plugins.lookup(name);
};

FileViewer.isPlugin = function (potentialPlugin) {
  return _.isFunction(potentialPlugin);
};

_.extend(FileViewer.prototype, Backbone.Events);


Object.defineProperty(FileViewer.prototype, 'analytics', {
  get: function () {
    return this._analytics;
  }
});

FileViewer.prototype.open = function (fileQuery, analyticsSource) {
  this._view.render().show().$el.appendTo(this._config.appendTo);
  this._view.delegateEvents();

  this._isOpen = true;
  this.trigger('fv.open');

  if (fileQuery) {
    this.showFileWithQuery(fileQuery).always(
      this.analytics.fn('files.fileviewer-web.opened', {
        source: analyticsSource
      })
    );
  }
};

FileViewer.prototype.close = function () {
  this._view._currentFile = null;
  this._view.undelegateEvents();
  this._view
    .hide()
    .$el.remove();

  this._isOpen = false;
  this.trigger('fv.close');
};


FileViewer.prototype.isOpen = function () {
  return this._isOpen;
};

FileViewer.prototype.showFileWithQuery = function (query) {
  this._fileState.setCurrentWithQuery(query);
  const file = this._fileState.getCurrent();
  return this.showFile(file);
};


FileViewer.prototype.showFileNext = function () {
  if (this.isShowingLastFile() && !this.getConfig().enableListLoop) {
    return $.when();
  }
  this._fileState.setNext();
  return this.showFile(this._fileState.getCurrent());
};


FileViewer.prototype.showFilePrev = function () {
  if (this.isShowingFirstFile() && !this.getConfig().enableListLoop) {
    return $.when();
  }
  this._fileState.setPrev();
  return this.showFile(this._fileState.getCurrent());
};

FileViewer.prototype.setFiles = function (newFiles, nextFileQuery) {
  this._files.reset(newFiles);
  this._fileState.setCurrentWithQuery(nextFileQuery);

  this.trigger('fv.setFiles');

  if (this.isOpen()) {
    this.showFile(this._fileState.getCurrent());
  }
};


FileViewer.prototype.getCurrent = function () {
  const currentFile = this._view.getCurrentFile();
  return currentFile && currentFile.toJSON();
};


FileViewer.prototype.getCurrentFile = function () {
  return this._view.getCurrentFile();
};

FileViewer.prototype.getFiles = function () {
  return this._files.toJSON();
};

FileViewer.prototype.isShowingFirstFile = function () {
  return this._fileState.attributes.currentFileIndex === 0;
};


FileViewer.prototype.isShowingLastFile = function () {
  return this._fileState.collection.length ===
    this._fileState.attributes.currentFileIndex + 1;
};

FileViewer.prototype.changeMode = function (mode) {
  this._view.setupMode(mode);
  this.trigger('fv.changeMode', mode);
};

FileViewer.prototype.getMode = function () {
  return this._view.getMode();
};

FileViewer.prototype.isInMode = function (mode) {
  return this._view.isInMode(mode);
};

FileViewer.prototype.addFileAction = function (opts) {
  this._view.fileControlsView.getLayerForName('moreButton').addFileAction(opts);
};

FileViewer.prototype.removeFileAction = function (opts) {
  this._view.fileControlsView.getLayerForName('moreButton').removeFileAction(opts);
};

FileViewer.prototype.supports = function (contentType) {
  const previewer = this._viewerRegistry.get(contentType);
  return previewer && previewer !== unknownFileTypeViewProvider;
};

FileViewer.prototype.set = function (key, value) {
  this._properties.set(key, value);
};


FileViewer.prototype.get = function (key) {
  return this._properties.get(key);
};

FileViewer.prototype.getConfig = function () {
  return this._config;
};

FileViewer.prototype.getView = function () {
  return this._view;
};

FileViewer.prototype.getStorage = function () {
  return this._storage;
};

FileViewer.prototype.showFile = function (file) {
  return this._showFile(file);
};

FileViewer.prototype.showFileWithCID = function (cid) {
  this._fileState.setCurrentWithCID(cid);
  return this.showFile(this._fileState.getCurrent());
};

FileViewer.prototype.showFileWithId = function (id, ownerId) {
  const fileQuery = {
    id: id
  };

  if (ownerId) {
    fileQuery.ownerId = ownerId;
  }

  return this.showFileWithQuery(fileQuery);
};


FileViewer.prototype.showFileWithSrc = function (src) {
  const fileQuery = {
    src: src
  };

  return this.showFileWithQuery(fileQuery);
};

FileViewer.prototype.showFileWhere = function (selector) {
  this._fileState.selectWhere(selector);
  return this.showFile(this._fileState.getCurrent());
};

FileViewer.prototype.updateFiles = function (files, mapFn) {
  if (!(mapFn && _.isFunction(mapFn))) {
    this._files.reset(files);
  } else {
    const newModels = _.chain(files)
      .map(function (file) {
        const matchedModel = this._files.find(function (collectionModel) {
          return mapFn(collectionModel.toJSON()) === mapFn(file);
        });
        if (matchedModel) {
          matchedModel.set(file);
        } else {
          return new File(file);
        }
      }.bind(this))
      .compact()
      .value();

    this._files.add(newModels, {
      silent: true
    });
    this._files.trigger('reset', this._files);
  }

  this.trigger('fv.updateFiles');

  return this._files.toJSON();
};

FileViewer.prototype._showFile = function (file) {
  const triggerEvent = function (event) {
    return function () {
      this.trigger(event, file);
    }.bind(this);
  }.bind(this);
  this.trigger('fv.changeFile', file);
  return this._view.showFile(file)
    .done(triggerEvent('fv.showFile'))
    .fail(triggerEvent('fv.showFileError'));
};


export default FileViewer
