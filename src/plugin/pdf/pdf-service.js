import { parseQueryString } from '../../util/util';

function PDFLinkService() {
  this.baseUrl = null;
  this.pdfDocument = null;
  this.pdfViewer = null;
  this.pdfHistory = null;
}

PDFLinkService.prototype = {
  get pagesCount() {
    return this.pdfDocument.numPages;
  },
  get page() {
    return this.pdfViewer.currentPageNumber;
  },
  set page(value) {
    this.pdfViewer.currentPageNumber = value;
  },
  setDocument:function (pdfDocument, baseUrl) {
    this.baseUrl = baseUrl;
    this.pdfDocument = pdfDocument;
    this._pagesRefCache = Object.create(null);
  },
  setViewer:function (pdfViewer) {
    this.pdfViewer = pdfViewer
  },
  setHistory:function (pdfHistory) {
    this.pdfHistory = pdfHistory
  }

}

PDFLinkService.prototype.navigateTo = function (dest) {
  var destString = '';
  var self = this;

  var goToDestination = function (destRef) {
    var pageNumber = destRef instanceof Object ?
      self._pagesRefCache[ destRef.num + ' ' + destRef.gen + ' R' ] :
      (destRef + 1);
    if (pageNumber) {
      if (pageNumber > self.pagesCount) {
        pageNumber = self.pagesCount;
      }
      self.pdfViewer.scrollPageIntoView(pageNumber, dest);
      if (self.pdfHistory) {
        self.pdfHistory.push({
          dest: dest,
          hash: destString,
          page: pageNumber
        });
      }
    } else {
      self.pdfDocument.getPageIndex(destRef).then(function (pageIndex) {
        var pageNum = pageIndex + 1;
        var cacheKey = destRef.num + ' ' + destRef.gen + ' R';
        self._pagesRefCache[ cacheKey ] = pageNum;
        goToDestination(destRef);
      });
    }
  };

  var destinationPromise;
  if (typeof dest === 'string') {
    destString = dest;
    destinationPromise = this.pdfDocument.getDestination(dest);
  } else {
    destinationPromise = Promise.resolve(dest);
  }
  destinationPromise.then(function (destination) {
    dest = destination;
    if (!(destination instanceof Array)) {
      return;
    }
    goToDestination(destination[ 0 ]);
  })
}

PDFLinkService.prototype.getDestinationHash = function (dest) {
  if (typeof dest === 'string') {
    return this.getAnchorUrl('#' + escape(dest));
  }
  if (dest instanceof Array) {
    var destRef = dest[ 0 ];
    var pageNumber = destRef instanceof Object ?
      this._pagesRefCache[ destRef.num + ' ' + destRef.gen + ' R' ] :
      (destRef + 1);
    if (pageNumber) {
      var pdfOpenParams = this.getAnchorUrl('#page=' + pageNumber);
      var destKind = dest[ 1 ];
      if (typeof destKind === 'object' && 'name' in destKind &&
        destKind.name === 'XYZ') {
        var scale = (dest[ 4 ] || this.pdfViewer.currentScaleValue);
        var scaleNumber = parseFloat(scale);
        if (scaleNumber) {
          scale = scaleNumber * 100;
        }
        pdfOpenParams += '&zoom=' + scale;
        if (dest[ 2 ] || dest[ 3 ]) {
          pdfOpenParams += ',' + (dest[ 2 ] || 0) + ',' + (dest[ 3 ] || 0);
        }
      }
      return pdfOpenParams;
    }
  }
  return this.getAnchorUrl('');
}

PDFLinkService.prototype.getAnchorUrl = function (anchor) {
  return (this.baseUrl || '') + anchor;
}

PDFLinkService.prototype.setHash = function (hash) {
  if (hash.indexOf('=') >= 0) {
    var params = parseQueryString(hash);
    if ('nameddest' in params) {
      if (this.pdfHistory) {
        this.pdfHistory.updateNextHashParam(params.nameddest);
      }
      this.navigateTo(params.nameddest);
      return;
    }
    var pageNumber, dest;
    if ('page' in params) {
      pageNumber = (params.page | 0) || 1;
    }
    if ('zoom' in params) {
      var zoomArgs = params.zoom.split(',');
      var zoomArg = zoomArgs[ 0 ];
      var zoomArgNumber = parseFloat(zoomArg);

      if (zoomArg.indexOf('Fit') === -1) {
        dest = [ null, {name: 'XYZ'},
          zoomArgs.length > 1 ? (zoomArgs[ 1 ] | 0) : null,
          zoomArgs.length > 2 ? (zoomArgs[ 2 ] | 0) : null,
          (zoomArgNumber ? zoomArgNumber / 100 : zoomArg) ];
      } else {
        if (zoomArg === 'Fit' || zoomArg === 'FitB') {
          dest = [ null, {name: zoomArg} ];
        } else if ((zoomArg === 'FitH' || zoomArg === 'FitBH') ||
          (zoomArg === 'FitV' || zoomArg === 'FitBV')) {
          dest = [ null, {name: zoomArg},
            zoomArgs.length > 1 ? (zoomArgs[ 1 ] | 0) : null ];
        } else if (zoomArg === 'FitR') {
          if (zoomArgs.length !== 5) {
            console.error('PDFLinkService_setHash: ' +
              'Not enough parameters for \'FitR\'.');
          } else {
            dest = [ null, {name: zoomArg},
              (zoomArgs[ 1 ] | 0), (zoomArgs[ 2 ] | 0),
              (zoomArgs[ 3 ] | 0), (zoomArgs[ 4 ] | 0) ];
          }
        } else {
          console.error('PDFLinkService_setHash: \'' + zoomArg +
            '\' is not a valid zoom value.');
        }
      }
    }
    if (dest) {
      this.pdfViewer.scrollPageIntoView(pageNumber || this.page, dest);
    } else if (pageNumber) {
      this.page = pageNumber; // simple page
    }
    if ('pagemode' in params) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('pagemode', true, true, {
        mode: params.pagemode
      });
      this.pdfViewer.container.dispatchEvent(event);
    }
  } else if (/^\d+$/.test(hash)) { // page number
    this.page = hash;
  } else { // named destination
    if (this.pdfHistory) {
      this.pdfHistory.updateNextHashParam(unescape(hash));
    }
    this.navigateTo(unescape(hash));
  }
}


PDFLinkService.prototype.executeNamedAction = function (action) {
  switch (action) {
    case 'GoBack':
      if (this.pdfHistory) {
        this.pdfHistory.back();
      }
      break;

    case 'GoForward':
      if (this.pdfHistory) {
        this.pdfHistory.forward();
      }
      break;

    case 'NextPage':
      this.page++;
      break;

    case 'PrevPage':
      this.page--;
      break;

    case 'LastPage':
      this.page = this.pagesCount;
      break;

    case 'FirstPage':
      this.page = 1;
      break;

    default:
      break;
  }
  var event = document.createEvent('CustomEvent');
  event.initCustomEvent('namedaction', true, true, {
    action: action
  });
  this.pdfViewer.container.dispatchEvent(event);
}
PDFLinkService.prototype.cachePageRef = function (pageNum, pageRef) {
  var refStr = pageRef.num + ' ' + pageRef.gen + ' R';
  this._pagesRefCache[ refStr ] = pageNum;
}


export default PDFLinkService
