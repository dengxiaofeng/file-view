import * as utils from './utils'
import { pdfProperty } from './pdf-properties';
import { renderStatus } from './render-status';
import { presentationMode } from './presentation-mode'
import TextLayerBuilder from './pdf-text-layer'
import { cache } from './pdf-cache';
const PDFJS = window.PDFJS;
const CustomStyle = PDFJS.CustomStyle;

function scrollIntoView(element, containerEl, spot) {
  let parent = containerEl;
  let offsetY = element.offsetTop + element.clientTop;
  let offsetX = element.offsetLeft + element.clientLeft;
  if (!parent) {
    console.error('container element is not set -- cannot scroll');
    return;
  }

  while (parent.clientHeight === parent.scrollHeight) {
    if (parent.dataset._scaleY) {
      offsetY /= parent.dataset._scaleY;
      offsetX /= parent.dataset._scaleX;
    }
    offsetY += parent.offsetTop;
    offsetX += parent.offsetLeft;
    parent = parent.offsetParent;
    if (!parent) {
      return;
    }
  }
  if (spot) {
    if (spot.top !== undefined) {
      offsetY += spot.top;
    }
    if (spot.left !== undefined) {
      offsetX += spot.left;
      parent.scrollLeft = offsetX;
    }
  }
  parent.scrollTop = offsetY;
}

function PageView(container, id, scale, defaultViewport, parentViewer) {
  this.id = id;

  this.parentViewer = parentViewer;

  this.rotation = 0;
  this.scale = scale || 1.0;
  this.viewport = defaultViewport;
  this.pdfPageRotate = defaultViewport.rotation;

  this.renderingState = renderStatus.INITIAL;
  this.resume = null;

  this.textLayer = null;

  this.layers = [];

  this.zoomLayer = null;

  this.annotationLayer = null; // custom layer for Confluence annotations pins
  this.linkLayer = null; // contains links refered to as AnnotationLayer in PDFJS

  const anchor = document.createElement('a');
  anchor.name = '' + this.id;

  const div = this.el = document.createElement('div');
  div.id = 'pageContainer' + this.id;
  div.setAttribute('data-page-number', this.id);
  div.className = 'page';
  div.style.width = Math.floor(this.viewport.width) + 'px';
  div.style.height = Math.floor(this.viewport.height) + 'px';

  container.appendChild(anchor);
  container.appendChild(div);

  this.setPdfPage = function (pdfPage) {
    this.pdfPage = pdfPage;
    this.pdfPageRotate = pdfPage.rotate;
    const totalRotation = (this.rotation + this.pdfPageRotate) % 360;
    this.viewport = pdfPage.getViewport(this.scale * pdfProperty.CSS_UNITS, totalRotation);
    this.stats = pdfPage.stats;
    this.reset();
  };

  this.destroy = function pageViewDestroy() {
    this.zoomLayer = null;
    this.reset();
    if (this.pdfPage) {
      this.pdfPage.destroy();
    }
  };

  this.reset = function (keepAnnotations, keepLinks) {
    if (this.renderTask) {
      this.renderTask.cancel();
    }
    this.resume = null;
    this.renderingState = renderStatus.INITIAL;

    div.style.width = Math.floor(this.viewport.width) + 'px';
    div.style.height = Math.floor(this.viewport.height) + 'px';

    const childNodes = div.childNodes;
    for (let i = div.childNodes.length - 1; i >= 0; i--) {
      const node = childNodes[ i ];
      if ((this.zoomLayer && this.zoomLayer === node) ||
        (keepAnnotations && this.annotationLayer === node) ||
        (keepLinks && this.linkLayer === node)) {
        continue;
      }
      div.removeChild(node);
    }
    div.removeAttribute('data-loaded');

    if (keepAnnotations) {
      if (this.annotationLayer) {
        // Hide annotationLayer until all elements are resized
        // so they are not displayed on the already-resized page
        this.annotationLayer.setAttribute('hidden', 'true');
      }
    } else {
      this.annotationLayer = null;
    }

    if (!keepLinks) {
      this.linkLayer = null;
    }

    delete this.canvas;
    this.loadingIconDiv = document.createElement('div');
    this.loadingIconDiv.className = 'loadingIcon';
    div.appendChild(this.loadingIconDiv);
  };

  this.update = function (scale, rotation) {
    this.scale = scale || this.scale;

    if (typeof rotation !== 'undefined') {
      this.rotation = rotation;
    }

    const totalRotation = (this.rotation + this.pdfPageRotate) % 360;
    this.viewport = this.viewport.clone({
      scale: this.scale * pdfProperty.CSS_UNITS,
      rotation: totalRotation
    });

    if (pdfProperty.USE_ONLY_CSS_ZOOM && this.canvas) {
      this.cssTransform(this.canvas);
      return;
    } else if (this.canvas && !this.zoomLayer) {
      this.zoomLayer = this.canvas.parentNode;
      this.zoomLayer.style.position = 'absolute';
    }
    if (this.zoomLayer) {
      this.cssTransform(this.zoomLayer.firstChild);
    }
    this.reset(true, true);
  };

  this.cssTransform = function (canvas) {
    const width = this.viewport.width;
    const height = this.viewport.height;
    canvas.style.width = canvas.parentNode.style.width = div.style.width = Math.floor(width) + 'px';
    canvas.style.height = canvas.parentNode.style.height = div.style.height = Math.floor(height) + 'px';
    const relativeRotation = this.viewport.rotation - canvas._viewport.rotation;
    const absRotation = Math.abs(relativeRotation);
    let scaleX = 1, scaleY = 1;
    if (absRotation === 90 || absRotation === 270) {
      scaleX = height / width;
      scaleY = width / height;
    }
    const cssTransform = 'rotate(' + relativeRotation + 'deg) ' +
      'scale(' + scaleX + ',' + scaleY + ')';
    CustomStyle.setProp('transform', canvas, cssTransform);

    if (this.textLayer) {
      const textRelativeRotation = this.viewport.rotation - this.textLayer.viewport.rotation;
      const textAbsRotation = Math.abs(textRelativeRotation);
      let scale = (width / canvas.width);
      if (textAbsRotation === 90 || textAbsRotation === 270) {
        scale = width / canvas.height;
      }
      const textLayerDiv = this.textLayer.textLayerDiv;
      let transX, transY;
      switch (textAbsRotation) {
        case 0:
          transX = transY = 0;
          break;
        case 90:
          transX = 0;
          transY = '-' + textLayerDiv.style.height;
          break;
        case 180:
          transX = '-' + textLayerDiv.style.width;
          transY = '-' + textLayerDiv.style.height;
          break;
        case 270:
          transX = '-' + textLayerDiv.style.width;
          transY = 0;
          break;
        default:
          console.error('Bad rotation value.');
          break;
      }
      CustomStyle.setProp('transform', textLayerDiv,
        'rotate(' + textAbsRotation + 'deg) ' +
        'scale(' + scale + ', ' + scale + ') ' +
        'translate(' + transX + ', ' + transY + ')');
      CustomStyle.setProp('transformOrigin', textLayerDiv, '0% 0%');
    }

    setupInternalLinks(div, this.pdfPage, this.viewport);
  };

  Object.defineProperty(this, 'width', {
    get: function () {
      return this.viewport.width;
    },
    enumerable: true
  });

  Object.defineProperty(this, 'height', {
    get: function () {
      return this.viewport.height;
    },
    enumerable: true
  });

  this.getPagePoint = function (x, y) {
    return this.viewport.convertToPdfPoint(x, y);
  };

  this.scrollIntoView = function (dest) {
    if (presentationMode.active) {
      if (this.parentViewer.page !== this.id) {
        this.parentViewer.page = this.id;
      }
      dest = null;
      this.parentViewer.setScale(this.parentViewer.currentScaleValue, true, true);
    }
    if (!dest) {
      scrollIntoView(div, this.parentViewer.el.container);
      return;
    }

    let x = 0, y = 0;
    let width = 0, height = 0, widthScale, heightScale;
    const changeOrientation = (this.rotation % 180 === 0 ? false : true);
    let pageWidth = (changeOrientation ? this.height : this.width) / this.scale / pdfProperty.CSS_UNITS;
    let pageHeight = (changeOrientation ? this.width : this.height) / this.scale / pdfProperty.CSS_UNITS;
    let scale = 0;
    if (!dest[ 1 ]) dest[ 1 ] = '';
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
        widthScale = (this.parentViewer.viewer.clientWidth - pdfProperty.VERTICAL_PADDING) /
          width / pdfProperty.CSS_UNITS;
        heightScale = (this.parentViewer.viewer.clientHeight - pdfProperty.VERTICAL_PADDING) /
          height / pdfProperty.CSS_UNITS;
        scale = Math.min(Math.abs(widthScale), Math.abs(heightScale));
        break;
      default:
        return;
    }

    if (scale && scale !== this.parentViewer.currentScale) {
      this.parentViewer.setScale(scale, true, true);
    } else if (this.parentViewer.currentScale === pdfProperty.UNKNOWN_SCALE) {
      this.parentViewer.setScale(pdfProperty.DEFAULT_SCALE, true, true);
    }

    if (scale === 'page-fit' && !dest[ 4 ]) {
      scrollIntoView(div, this.parentViewer.el.container);
      return;
    }

    const boundingRect = [
      this.viewport.convertToViewportPoint(x, y),
      this.viewport.convertToViewportPoint(x + width, y + height)
    ];
    const left = Math.min(boundingRect[ 0 ][ 0 ], boundingRect[ 1 ][ 0 ]);
    const top = Math.min(boundingRect[ 0 ][ 1 ], boundingRect[ 1 ][ 1 ]);

    scrollIntoView(div, this.parentViewer.el.container, {left: left, top: top});
  };

  this.getTextContent = function () {
    return this.parentViewer.getPage(this.id).then(function (pdfPage) {
      return pdfPage.getTextContent();
    });
  };

  this.draw = function (callback) {
    const pdfPage = this.pdfPage;
    const beforeLayer = this.annotationLayer || this.linkLayer || null;

    if (this.pagePdfPromise) {
      return;
    }
    if (!pdfPage) {
      const promise = this.parentViewer.getPage(this.id);
      promise.then(function (pdfPage) {
        delete this.pagePdfPromise;
        this.setPdfPage(pdfPage);
        this.draw(callback);
      }.bind(this));
      this.pagePdfPromise = promise;
      return;
    }

    if (this.renderingState !== renderStatus.INITIAL) {
      console.error('Must be in new state before drawing');
    }

    this.renderingState = renderStatus.RUNNING;

    const viewport = this.viewport;
    // Wrap the canvas so if it has a css transform for highdpi the overflow
    // will be hidden in FF.
    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.width = div.style.width;
    canvasWrapper.style.height = div.style.height;
    canvasWrapper.classList.add('canvasWrapper');

    const canvas = document.createElement('canvas');
    canvas.id = 'page' + this.id;
    canvas.setAttribute('hidden', 'hidden');
    let isCanvasHidden = true;
    canvasWrapper.appendChild(canvas);

    div.insertBefore(canvasWrapper, beforeLayer);

    this.canvas = canvas;

    canvas.mozOpaque = true;
    const ctx = canvas.getContext('2d', {alpha: false});
    const outputScale = utils.getOutputScale(ctx);

    if (pdfPage.USE_ONLY_CSS_ZOOM) {
      const actualSizeViewport = viewport.clone({scale: pdfProperty.CSS_UNITS});
      // Use a scale that will make the canvas be the original intended size
      // of the page.
      outputScale.sx *= actualSizeViewport.width / viewport.width;
      outputScale.sy *= actualSizeViewport.height / viewport.height;
      outputScale.scaled = true;
    }

    const sfx = utils.approximateFraction(outputScale.sx);
    const sfy = utils.approximateFraction(outputScale.sy);
    canvas.width = utils.roundToDivide(viewport.width * outputScale.sx, sfx[ 0 ]);
    canvas.height = utils.roundToDivide(viewport.height * outputScale.sy, sfy[ 0 ]);
    canvas.style.width = utils.roundToDivide(viewport.width, sfx[ 1 ]) + 'px';
    canvas.style.height = utils.roundToDivide(viewport.height, sfy[ 1 ]) + 'px';
    // Add the viewport so it's known what it was originally drawn with.
    canvas._viewport = viewport;

    let textLayerDiv = null;
    if (!PDFJS.disableTextLayer) {
      textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.width = canvas.style.width;
      textLayerDiv.style.height = canvas.style.height;

      div.insertBefore(textLayerDiv, beforeLayer);
    }
    const textLayer = this.textLayer =
      textLayerDiv ? new TextLayerBuilder({
        textLayerDiv: textLayerDiv,
        pageIndex: this.id - 1,
        lastScrollSource: parentViewer,
        viewport: this.viewport,
        isViewerInPresentationMode: presentationMode.active
      }) : null;

    if (!this.linkLayer) {
      // Adding linkLayer before layerBuilders to ensure proper
      // order of the layers.
      const linkLayerDiv = document.createElement('div');
      linkLayerDiv.className = 'linkLayer';
      div.appendChild(linkLayerDiv);
      this.linkLayer = linkLayerDiv;
    }

    // when in presentation mode, we don't want to render any layers (i.e annotation) on top of pdf pages
    if (parentViewer.layerBuilders && !presentationMode.active) {
      for (let i = 0; i < parentViewer.layerBuilders.length; i++) {
        let layerDiv = document.createElement('div');
        layerDiv.style.width = canvas.style.width;
        layerDiv.style.height = canvas.style.height;

        let LayerBuilder = parentViewer.layerBuilders[ i ];
        let layer = new LayerBuilder({
          layerDiv: layerDiv,
          pageIndex: this.id - 1,
          lastScrollSource: parentViewer,
          viewport: this.viewport,
          isViewerInPresentationMode: presentationMode.active
        });
        this.layers.push(layer);
        div.appendChild(layerDiv);
        layer.setupRenderLayoutTimer && layer.setupRenderLayoutTimer();
      }
    }

    // Rendering area

    let self = this;

    function pageViewDrawCallback(error) {
      // The renderTask may have been replaced by a new one, so only remove the
      // reference to the renderTask if it matches the one that is triggering
      // this callback.
      if (renderTask === self.renderTask) {
        self.renderTask = null;
      }

      if (error === 'cancelled') {
        return;
      }

      self.renderingState = renderStatus.FINISHED;

      if (isCanvasHidden) {
        self.canvas.removeAttribute('hidden');
        isCanvasHidden = false;
      }

      if (self.loadingIconDiv) {
        div.removeChild(self.loadingIconDiv);
        delete self.loadingIconDiv;
      }

      if (self.zoomLayer) {
        div.removeChild(self.zoomLayer);
        self.zoomLayer = null;
      }

      // @todo: send event specifying the error

      if (self.onAfterDraw) {
        self.onAfterDraw();
      }

      cache.push(self);

      let event = document.createEvent('CustomEvent');
      event.initCustomEvent('pagerender', true, true, {
        pageNumber: pdfPage.pageNumber
      });
      div.dispatchEvent(event);

      callback();
    }

    let transform = !outputScale.scaled ? null : [ outputScale.sx, 0, 0, outputScale.sy, 0, 0 ];

    let renderContext = {
      canvasContext: ctx,
      transform: transform,
      viewport: this.viewport,
      textLayer: textLayer,
      // intent: 'default', // === 'display'
      continueCallback: function (cont) {
        if (self.parentViewer.highestPriorityPage !== 'page' + self.id) {
          self.renderingState = renderStatus.PAUSED;
          self.resume = function resumeCallback() {
            self.renderingState = renderStatus.RUNNING;
            cont();
          };
          return;
        }
        if (isCanvasHidden) {
          self.canvas.removeAttribute('hidden');
          isCanvasHidden = false;
        }
        cont();
      }
    };

    const renderTask = this.renderTask = this.pdfPage.render(renderContext);

    this.renderTask.promise.then(
      function pdfPageRenderCallback() {
        pageViewDrawCallback(null);
        if (textLayer) {
          self.getTextContent().then(
            function textContentResolved(textContent) {
              textLayer.setTextContent(textContent);
            }
          );
        }
      },
      function pdfPageRenderError(error) {
        pageViewDrawCallback(error);
      }
    );

    setupInternalLinks(div, pdfPage, this.viewport);
    div.setAttribute('data-loaded', true);
  };

  const setupInternalLinks = function (pageDiv, pdfPage, viewport) {
    const self = this;
    const pdfViewer = self.parentViewer;

    pdfPage.getAnnotations().then(function (annotationsData) {
      const PDFJS = window.PDFJS;
      viewport = viewport.clone({dontFlip: true});

      if (self.linkLayer && self.linkLayer.childElementCount > 0) {
        PDFJS.AnnotationLayer.update({
          viewport: viewport,
          div: self.linkLayer,
          page: pdfPage,
          annotations: annotationsData,
          linkService: pdfViewer.linkService
        });
      } else {
        if (annotationsData.length === 0) {
          return;
        }

        if (!self.linkLayer) {
          self.linkLayer = document.createElement('div');
          self.linkLayer.className = 'linkLayer';
          pageDiv.appendChild(self.linkLayer);
        }

        self.linkLayer.innerHTML = '';
        PDFJS.AnnotationLayer.render({
          viewport: viewport,
          div: self.linkLayer,
          page: pdfPage,
          annotations: annotationsData,
          linkService: pdfViewer.linkService
        });
      }
    });
  }.bind(this);
};

export default PageView
