import _ from 'underscore'
import $ from 'jquery'
import { pdfProperty } from './pdf-properties';
import PageView from './pdf-pageview'
import { renderStatus } from './render-status';
import { presentationMode } from './presentation-mode'
import { cache } from './pdf-cache';
import { noop } from '../../util/util';



var PDFJS = window.PDFJS;


function PDFViewer(options) {
  PDFJS.UnsupportedManager.listen(_.bind(PDFViewer.prototype.fallback, PDFViewer));
  PDFJS.verbosity = PDFJS.VERBOSITY_LEVELS.errors;
  PDFJS.cMapPacked = true;
  PDFJS.disableAutoFetch = true;
  this.lastScroll = 0;
  this.layerBuilders = [];
  this.pages = [];
  this._pagePadding = {
    x: pdfProperty.SCROLLBAR_PADDING,
    y: pdfProperty.VERTICAL_PADDING
  };
  this.linkService = options.linkService;
}


PDFViewer.prototype.watchScroll = function pdfViewWatchScroll(viewAreaElement, state, callback) {
  state.down = true;
  state.lastY = viewAreaElement.scrollTop;
  var viewer = this;
  $(viewAreaElement).on('scroll.pdfViewer', function webViewerScroll(evt) {
    viewer.lastScroll = Date.now();
    var currentY = viewAreaElement.scrollTop;
    var lastY = state.lastY;
    if (currentY > lastY) {
      state.down = true;
    } else if (currentY < lastY) {
      state.down = false;
    }
    // else do nothing and use previous value
    state.lastY = currentY;
    callback.call(viewer);
  });
};


PDFViewer.prototype.watchScrollEnd = function (viewAreaElement) {
  $(viewAreaElement).off('scroll.pdfViewer');
};

PDFViewer.prototype.setContainer = function (args) {
  this.el = {
    container: args.container,
    viewer: args.viewer,
    outerContainer: args.outerContainer
  };
};

PDFViewer.prototype.addLayerBuilder = function (layerBuilder) {
  if (layerBuilder) {
    this.layerBuilders.push(layerBuilder);
  }
};

PDFViewer.prototype._setScaleUpdatePages = function (newScale, newValue, resetAutoSettings, noScroll) {
  this.currentScaleValue = newValue;
  if (newScale === this.currentScale) {
    return;
  }
  for (var i = 0, ii = this.pages.length; i < ii; i++) {
    this.pages[ i ].update(newScale);
  }
  this.currentScale = newScale;

  if (!noScroll) {
    var page = this.page, dest;
    if (this.currentPosition && !pdfProperty.IGNORE_CURRENT_POSITION_ON_ZOOM) {
      page = this.currentPosition.page;
      dest = [ null, {name: 'XYZ'}, this.currentPosition.left,
        this.currentPosition.top, null ];
    }
    this.pages[ page - 1 ].scrollIntoView(dest);
  }
  var event = document.createEvent('UIEvents');
  event.initUIEvent('scalechange', false, false, window, 0);
  event.scale = newScale;
  event.resetAutoSettings = resetAutoSettings;
  window.dispatchEvent(event);
};


PDFViewer.prototype.setPagePadding = function (padding) {
  this._pagePadding = {
    x: parseInt(padding.x, 10) || 0,
    y: parseInt(padding.y, 10) || 0
  };
};

PDFViewer.prototype.setScale = function (value, resetAutoSettings, noScroll) {
  if (value === 'custom') {
    return;
  }
  var scale = parseFloat(value);

  if (scale > 0) {
    this._setScaleUpdatePages(scale, value, true, noScroll);
  } else {
    var currentPage = this.pages[ this.page - 1 ];
    if (!currentPage) {
      return;
    }
    var hPadding = this._pagePadding.x;
    var vPadding = this._pagePadding.y;
    var pageWidthScale = (this.el.container.clientWidth - hPadding) /
      currentPage.width * currentPage.scale;
    var pageHeightScale = (this.el.container.clientHeight - vPadding) /
      currentPage.height * currentPage.scale;
    switch (value) {
      case 'page-actual':
        scale = 1;
        break;
      case 'page-width':
        scale = pageWidthScale;
        break;
      case 'page-height':
        scale = pageHeightScale;
        break;
      case 'page-fit':
        // Resolve 'page-fit' to actual scale mode
        scale = Math.min(pageWidthScale, pageHeightScale);
        if (scale === pageWidthScale) {
          value = 'page-width';
        } else {
          value = 'page-height';
        }
        break;
      case 'auto':
        scale = Math.min(pdfProperty.MAX_AUTO_SCALE, pageWidthScale);
        break;
      default:
        console.error('pdfViewSetScale: \'' + value +
          '\' is an unknown zoom value.');
        return;
    }
    this._setScaleUpdatePages(scale, value, resetAutoSettings, noScroll);
  }
};

PDFViewer.prototype.zoomIn = function (ticks) {
  var newScale = this.currentScale;
  do {
    newScale = (newScale * pdfProperty.DEFAULT_SCALE_DELTA).toFixed(2);
    newScale = Math.ceil(newScale * 10) / 10;
    newScale = Math.min(pdfProperty.MAX_SCALE, newScale);
  } while (--ticks && newScale < pdfProperty.MAX_SCALE);
  this.setScale(newScale, true);
};

PDFViewer.prototype.zoomOut = function (ticks) {
  var newScale = this.currentScale;
  do {
    newScale = (newScale / pdfProperty.DEFAULT_SCALE_DELTA).toFixed(2);
    newScale = Math.floor(newScale * 10) / 10;
    newScale = Math.max(pdfProperty.MIN_SCALE, newScale);
  } while (--ticks && newScale > pdfProperty.MIN_SCALE);
  this.setScale(newScale, true);
};

PDFViewer.prototype.openFile = function (url, scale, password, passwordLayer, pdfDataRangeTransport, args) {
  var parameters = {};
  if (typeof url === 'string') {
    parameters.url = url;
  } else if (url && 'byteLength' in url) {
    parameters.data = url;
  }

  if (args) {
    for (var prop in args) {
      parameters[ prop ] = args[ prop ];
    }
  }

  var self = this;
  self.loading = true;
  self.downloadComplete = false;

  self._pdfLoadingTask = PDFJS.getDocument(parameters, pdfDataRangeTransport);

  self._pdfLoadingTask.onProgress = function getDocumentProgress(progressData) {
    self.progress(progressData.loaded / progressData.total);
  };

  self._pdfLoadingTask.onPassword = function passwordNeeded(updatePassword, reason) {
    passwordLayer.showPasswordInput(reason, updatePassword);
  };

  return self._pdfLoadingTask.promise.then(
    function getDocumentCallback(pdfDocument) {
      var loadedPromise = self.load(pdfDocument, scale);
      self.loading = false;
      return loadedPromise;
    },
    function getDocumentError(message, exception) {
      self.loading = false;
      return new Promise(function (resolve, reject) {
        reject(exception || new Error(message));
      });
    }
  );
};

PDFViewer.prototype.close = function () {
  if (!this._pdfLoadingTask) {
    return;
  }

  this._pdfLoadingTask.then(function () {
    this.cleanup();

    this.pdfDocument.destroy();
    this.pdfDocument = null;

    // CONFDEV-27408: The code below is likely a sign of a leak suspect
    clearTimeout(this.idleTimeout);
    for (var i = 0; i < this.pages.length; i++) {
      this.pages[ i ].destroy();
    }
    this.pages = [];

    var container = this.el.viewer;
    while (container.hasChildNodes()) {
      container.removeChild(container.lastChild);
    }
  }.bind(this), function (error) {
    // We try to keep expected errors out of the console so
    // we ignore errors about missing PDFs in the #close() method
    if (error.name !== 'MissingPDFException') {
      throw (error);
    }
  });

  this._pdfLoadingTask.destroy();
  this.pdfLoadingTask = null;
};

PDFViewer.prototype.load = function (pdfDocument, scale) {
  var self = this;
  var isOnePageRenderedResolved = false;
  var resolveOnePageRendered = null;

  var onePageRendered = new Promise(function (resolve) {
    resolveOnePageRendered = resolve;
  });

  function bindOnAfterDraw(pageView) {
    pageView.onAfterDraw = function pdfViewLoadOnAfterDraw() {
      if (!isOnePageRenderedResolved) {
        isOnePageRenderedResolved = true;
        resolveOnePageRendered();
      }
    };
  }

  this.pdfDocument = pdfDocument;
  var baseDocumentUrl = null;
  this.linkService.setDocument(pdfDocument, baseDocumentUrl);

  var downloadedPromise = pdfDocument.getDownloadInfo().then(function () {
    self.downloadComplete = true;
    var outerContainer = self.el.outerContainer;
    outerContainer.classList.remove('loadingInProgress');
  });

  var pagesCount = pdfDocument.numPages;

  // @todo: send event specifying the pageCount and other metadata

  var pages = this.pages = [];
  self.pagesRefMap = {};

  var firstPagePromise = pdfDocument.getPage(1);
  var container = this.el.viewer;

  var parentViewer = this;

  // Fetch a single page so we can get a viewport that will be the default
  // viewport for all pages
  firstPagePromise.then(function (pdfPage) {
    var viewport = pdfPage.getViewport(1.0 * pdfProperty.CSS_UNITS);
    for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
      var viewportClone = viewport.clone();
      var pageView = new PageView(container, pageNum, 0, viewportClone, parentViewer);
      bindOnAfterDraw(pageView);
      pages.push(pageView);
    }

    // Fetch all the pages since the viewport is needed before printing
    // starts to create the correct size canvas. Wait until one page is
    // rendered so we don't tie up too many resources early on.
    onePageRendered.then(function () {
      if (!PDFJS.disableAutoFetch) {
        for (var pageNum = 1; pageNum <= pagesCount; ++pageNum) {
          pdfDocument.getPage(pageNum).then(function (pageNum, pdfPage) {
            var pageView = pages[ pageNum - 1 ];
            if (!pageView.pdfPage) {
              pageView.setPdfPage(pdfPage);
            }
            var refStr = pdfPage.ref.num + ' ' + pdfPage.ref.gen + ' R';
            self.pagesRefMap[ refStr ] = pageNum;
            self.linkService.cachePageRef(pageNum, pdfPage.ref);
          }.bind(null, pageNum));
        }
      }
    });

    downloadedPromise.then(function () {
      // CONFDEV-27407: This is where our load event (non document) should be fired on('pdfloaded')
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('documentload', true, true, {});
      window.dispatchEvent(event);
    });

    return downloadedPromise;
  });

  Promise.all([ firstPagePromise ]).then(function resolved() {
    self.setInitialView(null, scale);
  }, function rejected(errorMsg) {

    firstPagePromise.then(function () {
      self.setInitialView(null, scale);
    });
  });

  self.destinationsPromise = pdfDocument.getDestinations();
  self.destinationsPromise.then(function (destinations) {
    self.destinations = destinations;
  });

  pdfDocument.getMetadata().then(function (data) {
    /* eslint-disable no-console*/
    var info = data.info, metadata = data.metadata;
    self.documentInfo = info;
    self.metadata = metadata;

    // Provides some basic debug information
    if (PDFJS.pdfBug) {
      var debugMsg = [];
      debugMsg.push('PDF Fingerprint: ' + pdfDocument.fingerprint);
      debugMsg.push('Version: ' + info.PDFFormatVersion);
      debugMsg.push('Producer: ' + (info.Producer || '-').trim());
      debugMsg.push('Creator: ' + (info.Creator || '-').trim());
      debugMsg.push('PDF.js: ' + (PDFJS.version || '-'));
      console.info(debugMsg.join('; '));
    }

    var pdfTitle;
    if (metadata && metadata.has('dc:title')) {
      pdfTitle = metadata.get('dc:title');
    }

    if (!pdfTitle && info && info[ 'Title' ]) {
      pdfTitle = info[ 'Title' ];
    }

    if (PDFJS.pdfBug && pdfTitle) {
      console.info(pdfTitle);
    }

    if (info.IsAcroFormPresent) {
      console.warn('Warning: AcroForm/XFA is not supported');
      self.fallback(PDFJS.UNSUPPORTED_FEATURES.forms);
    }
    /* eslint-enable no-console*/
  });
};


PDFViewer.prototype.setInitialView = function pdfViewSetInitialView(storedHash, scale) {
  // Reset the current scale, as otherwise the page's scale might not get
  // updated if the zoom level stayed the same.
  this.currentScale = 0;
  this.currentScaleValue = null;
  // Reset the current position when loading a new file,
  // to prevent displaying the wrong position in the document.
  var currentPage = this.pages[ 0 ];
  var topLeft = currentPage.getPagePoint((this.el.viewer.scrollLeft - currentPage.x),
    (this.el.viewer.scrollTop - currentPage.y));
  var intLeft = Math.round(topLeft[ 0 ]);
  var intTop = Math.round(topLeft[ 1 ]);
  this.currentPosition = {page: 1, left: intLeft, top: intTop};

  this.page = 1;
  this.setScale(scale, true);

  if (this.currentScale === pdfProperty.UNKNOWN_SCALE) {
    // Scale was not initialized: invalid bookmark or scale was not specified.
    // Setting the default one.
    this.setScale(pdfProperty.DEFAULT_SCALE, true);
  }
};

PDFViewer.prototype.renderHighestPriority = function pdfViewRenderHighestPriority() {
  if (this.idleTimeout) {
    clearTimeout(this.idleTimeout);
    this.idleTimeout = null;
  }

  // Pages have a higher priority than thumbnails, so check them first.
  var visiblePages = this.getVisiblePages();
  var pageView = this.getHighestPriority(visiblePages, this.pages, noop.down);
  if (pageView) {
    this.renderView(pageView, 'page');
    return;
  }

  var that = this;
  this.idleTimeout = setTimeout(function () {
    that.cleanup();
  }, pdfProperty.CLEANUP_TIMEOUT);
};

PDFViewer.prototype.cleanup = function pdfViewCleanup() {
  for (var i = 0, ii = this.pages.length; i < ii; i++) {
    if (this.pages[ i ] &&
      this.pages[ i ].renderingState !== renderStatus.FINISHED) {
      this.pages[ i ].reset();
    }
  }
  this.pdfDocument.cleanup();
};

PDFViewer.prototype.getHighestPriority = function pdfViewGetHighestPriority(visible, views, scrolledDown) {
  // The state has changed figure out which page has the highest priority to
  // render next (if any).
  // Priority:
  // 1 visible pages
  // 2 if last scrolled down page after the visible pages
  // 2 if last scrolled up page before the visible pages
  var visibleViews = visible.views;

  var numVisible = visibleViews.length;
  if (numVisible === 0) {
    return false;
  }
  for (var i = 0; i < numVisible; ++i) {
    var view = visibleViews[ i ].view;
    if (!this.isViewFinished(view)) {
      return view;
    }
  }
  if (scrolledDown) {
    var nextPageIndex = visible.last.id;
    if (views[ nextPageIndex ] && !this.isViewFinished(views[ nextPageIndex ])) {
      return views[ nextPageIndex ];
    }
  } else {
    var previousPageIndex = visible.first.id - 2;
    if (views[ previousPageIndex ] &&
      !this.isViewFinished(views[ previousPageIndex ])) {
      return views[ previousPageIndex ];
    }
  }
  return false;
};

PDFViewer.prototype.isViewFinished = function pdfViewIsViewFinished(view) {
  return view.renderingState === renderStatus.FINISHED;
};

PDFViewer.prototype.renderView = function pdfViewRender(view, type) {
  var state = view.renderingState;
  switch (state) {
    case renderStatus.FINISHED:
      return false;
    case renderStatus.PAUSED:
      this.highestPriorityPage = type + view.id;
      view.resume();
      break;
    case renderStatus.RUNNING:
      this.highestPriorityPage = type + view.id;
      break;
    case renderStatus.INITIAL:
      this.highestPriorityPage = type + view.id;
      view.draw(this.renderHighestPriority.bind(this));
      break;
  }
  return true;
};

PDFViewer.prototype.getVisibleElements = function pdfViewGetVisibleElements(scrollEl, views, sortByVisibility) {
  var top = scrollEl.scrollTop, bottom = top + scrollEl.clientHeight;
  var left = scrollEl.scrollLeft, right = left + scrollEl.clientWidth;

  var visible = [], view;
  var currentHeight, viewHeight, hiddenHeight, percentHeight;
  var currentWidth, viewWidth;
  for (var i = 0, ii = views.length; i < ii; ++i) {
    view = views[ i ];
    currentHeight = view.el.offsetTop + view.el.clientTop;
    viewHeight = view.el.clientHeight;
    if ((currentHeight + viewHeight) < top) {
      continue;
    }
    if (currentHeight > bottom) {
      break;
    }
    currentWidth = view.el.offsetLeft + view.el.clientLeft;
    viewWidth = view.el.clientWidth;
    if ((currentWidth + viewWidth) < left || currentWidth > right) {
      continue;
    }
    hiddenHeight = Math.max(0, top - currentHeight) +
      Math.max(0, currentHeight + viewHeight - bottom);
    percentHeight = ((viewHeight - hiddenHeight) * 100 / viewHeight) | 0;

    visible.push({
      id: view.id, x: currentWidth, y: currentHeight,
      view: view, percent: percentHeight
    });
  }

  var first = visible[ 0 ];
  var last = visible[ visible.length - 1 ];

  if (sortByVisibility) {
    visible.sort(function (a, b) {
      var pc = a.percent - b.percent;
      if (Math.abs(pc) > 0.001) {
        return -pc;
      }
      return a.id - b.id;
    });
  }
  return {first: first, last: last, views: visible};
};

PDFViewer.prototype.getVisiblePages = function pdfViewGetVisiblePages() {
  if (!presentationMode.active) {
    return this.getVisibleElements(this.el.container, this.pages, true);
  } else {
    var visible = [];
    var currentPage = this.pages[ this.page - 1 ];
    visible.push({id: currentPage.id, view: currentPage});
    return {first: currentPage, last: currentPage, views: visible};
  }
};

PDFViewer.prototype.updateViewarea = function () {
  var visible = this.getVisiblePages();
  if (!visible || visible.views.length === 0) {
    return;
  }
  var visiblePages = visible.views;

  var suggestedCacheSize = Math.max(pdfProperty.DEFAULT_CACHE_SIZE,
    2 * visiblePages.length + 1);
  cache.resize(suggestedCacheSize);

  this.renderHighestPriority(visible);

  var currentId = this.page;
  var firstPage = visible.first;

  for (var i = 0, ii = visiblePages.length, stillFullyVisible = false;
       i < ii; ++i) {
    var page = visiblePages[ i ];

    if (page.percent < 100) {
      break;
    }
    if (page.id === this.page) {
      stillFullyVisible = true;
      break;
    }
  }

  if (!stillFullyVisible) {
    currentId = visiblePages[ 0 ].id;
  }

  if (!presentationMode.active) {
    this.updateViewarea.inProgress = true; // used in 'set page'
    this.page = currentId;
    this.updateViewarea.inProgress = false;
  }

  var pageNumber = firstPage.id;
  var currentPage = this.pages[ pageNumber - 1 ];
  var container = this.el.container;
  var topLeft = currentPage.getPagePoint((container.scrollLeft - firstPage.x),
    (container.scrollTop - firstPage.y));
  var intLeft = Math.round(topLeft[ 0 ]);
  var intTop = Math.round(topLeft[ 1 ]);

  if (presentationMode.active || presentationMode.switchInProgress) {
    this.currentPosition = null;
  } else {
    this.currentPosition = {page: pageNumber, left: intLeft, top: intTop};
  }
};

PDFViewer.prototype.getPage = function(n) {
  return this.pdfDocument.getPage(n);
};

PDFViewer.prototype.fallback = function () {
};

PDFViewer.prototype.progress = function () {
};

PDFViewer.prototype.goToNextPage = function () {
  this.goToPage(this.page + 1);
};

PDFViewer.prototype.goToPreviousPage = function () {
  this.goToPage(this.page - 1);
};

PDFViewer.prototype.goToPage = function (pageNumber) {
  if (this.pages && this.pages[ pageNumber - 1 ]) {
    this.pages[ pageNumber - 1 ].scrollIntoView([ null, {name: 'Fit'} ]);
  }
};

PDFViewer.prototype.scrollPageIntoView = function (pageNumber, dest) {
  if (!this.pdfDocument) {
    return;
  }

  var pageView = this.pages[ pageNumber - 1 ];

  if (this.isInPresentationMode) {
    if (this._currentPageNumber !== pageView.id) {
      this.currentPageNumber = pageView.id;
      return;
    }
    dest = null;
    // Fixes the case when PDF has different page sizes.
    this._setScale(this._currentScaleValue, true);
  }
  if (!dest) {
    pageView.scrollIntoView(pageView.div, this.el.viewer);
    return;
  }

  var x = 0, y = 0;
  var width = 0, height = 0, widthScale, heightScale;
  var changeOrientation = (pageView.rotation % 180 === 0 ? false : true);
  var pageWidth = (changeOrientation ? pageView.height : pageView.width) /
    pageView.scale / pdfProperty.CSS_UNITS;
  var pageHeight = (changeOrientation ? pageView.width : pageView.height) /
    pageView.scale / pdfProperty.CSS_UNITS;
  var scale = 0;
  switch (dest[ 1 ].name) {
    case 'XYZ':
      x = dest[ 2 ];
      y = dest[ 3 ];
      scale = dest[ 4 ];
      x = x !== null ? x : 0;
      y = y !== null ? y : pageHeight;
      break;
    case 'Fit':
    case 'FitB':
      scale = 'page-fit';
      break;
    case 'FitH':
    case 'FitBH':
      y = dest[ 2 ];
      scale = 'page-width';
      if (y === null && this._location) {
        x = this._location.left;
        y = this._location.top;
      }
      break;
    case 'FitV':
    case 'FitBV':
      x = dest[ 2 ];
      width = pageWidth;
      height = pageHeight;
      scale = 'page-height';
      break;
    case 'FitR':
      x = dest[ 2 ];
      y = dest[ 3 ];
      width = dest[ 4 ] - x;
      height = dest[ 5 ] - y;
      var hPadding = this.removePageBorders ? 0 : pdfProperty.SCROLLBAR_PADDING;
      var vPadding = this.removePageBorders ? 0 : pdfProperty.VERTICAL_PADDING;

      widthScale = (this.container.clientWidth - hPadding) / width / pdfProperty.CSS_UNITS;
      heightScale = (this.container.clientHeight - vPadding) / height / pdfProperty.CSS_UNITS;
      scale = Math.min(Math.abs(widthScale), Math.abs(heightScale));
      break;
    default:
      return;
  }

  if (scale && scale !== this._currentScale) {
    this.currentScaleValue = scale;
  } else if (this._currentScale === pdfProperty.UNKNOWN_SCALE) {
    this.currentScaleValue = pdfProperty.DEFAULT_SCALE_VALUE;
  }

  if (scale === 'page-fit' && !dest[ 4 ]) {
    pageView.scrollIntoView(pageView.div, this.el.viewer);
    return;
  }

  var boundingRect = [
    pageView.viewport.convertToViewportPoint(x, y),
    pageView.viewport.convertToViewportPoint(x + width, y + height)
  ];
  var left = Math.min(boundingRect[ 0 ][ 0 ], boundingRect[ 1 ][ 0 ]);
  var top = Math.min(boundingRect[ 0 ][ 1 ], boundingRect[ 1 ][ 1 ]);
  pageView.scrollIntoView(pageView.div, this.el.viewer, {left: left, top: top});
}

export default PDFViewer

