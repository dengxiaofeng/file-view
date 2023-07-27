import { pdfProperty } from './pdf-properties'
import $ from 'jquery'

function AnnotationLayerBuilder(options) {
  this.annotations = options.annotations;
  this._fileViewer = options.fileViewer;
  this.PinsView = options.PinsView;
  this.annotationLayers = [];
}

AnnotationLayerBuilder.prototype.create = function () {
  var self = this

  function AnnotationLayer(options) {
    this.layerDiv = options.layerDiv;
    this.pageIdx = options.pageIndex;
    this.lastScrollSource = options.lastScrollSource || null;
    this.viewport = options.viewport;
    this.isViewerInPresentationMode = options.isViewerInPresentationMode;
    this.renderTimer = null;
    self.annotationLayers.push(this);

    this.pinsView = new self.PinsView({
      fileViewer: self._fileViewer,
      container: $(this.layerDiv),
      filter: function (annotation) {
        return annotation.get('pageNumber') === this.pageIdx + 1;
      }.bind(this),
      collection: self.annotations
    });
    this.layerDiv.className = 'annotationLayer';
  }

  AnnotationLayer.prototype.render = function () {
    this.pinsView.render();
  }
  AnnotationLayer.prototype.setupRenderLayoutTimer = function () {
    var self = this;
    var lastScroll = (this.lastScrollSource === null ? 0 : this.lastScrollSource.lastScroll);
    if (Date.now() - lastScroll > pdfProperty.RENDER_DELAY) {
      this.render();
    } else {
      if (this.renderTimer) {
        clearTimeout(this.renderTimer);
      }
      this.renderTimer = setTimeout(function () {
        self.setupRenderLayoutTimer();
      }, pdfProperty.RENDER_DELAY);
    }
  }
  return AnnotationLayer
}

AnnotationLayerBuilder.prototype.updateAnnotations = function (annotations) {
  this.annotations = annotations;
  this.annotationLayers.forEach(function (layer) {
    layer.render();
  });
}


export default AnnotationLayerBuilder
