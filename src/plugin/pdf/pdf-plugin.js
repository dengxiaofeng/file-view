// import Backbone from 'backbone'
//
import $ from 'jquery'
import '../../resource/lib/pdf';
import { pdfProperty } from './pdf-properties'
import { noop } from '../../util/util'
import { presentationMode } from './presentation-mode'
import PDFLinkService from './pdf-service'
import AnnotationLayerBuilder from './pdf-annotation-layer'
import BaseViewer from '../../core/component/BaseViewer'
import { _templateStore } from '../../core/store/template-store'
import createPdfError from './createPdfError'
import PDFViewer from './pdf-viewer'
import './pdf.css'

const PDFJS = window.PDFJS

PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK

let when = function(val) {
  if (val && val.then) {
    return val
  }
  return new $.Deferred().resolve(val).promise()
}

const SCALE = {
  PAGE_WIDTH: 'page-width',
  PAGE_HEIGHT: 'page-height',
  PAGE_FIT: 'page-fit',
  AUTO: 'auto',
  PAGE_ACTUAL: 'page-actual',
  CUSTOM: 'custom'
}


const PDFView = BaseViewer.extend({
  id: 'cp-pdf-preview',
  tagName: 'div',
  initialize: function() {
    BaseViewer.prototype.initialize.apply(this, arguments)

    const linkService = this.linkService = new PDFLinkService()

    const viewer = this.viewer = new PDFViewer({
      container: document.getElementById('cp-pdf-preview'),
      viewer: document.getElementById('viewer'),
      linkService: linkService
    })

    linkService.setViewer(viewer)

    this.fileBody = document.getElementById('cp-file-body')

    this.scaleChangeListener = function(evt) {
      viewer.updateViewarea()
      this._fileViewer.getView().updatePaginationButtons()
    }.bind(this)

    $(window).on('scalechange.pdfPreviewView', this.scaleChangeListener)
    //
    viewer.watchScroll(this.el, noop, viewer.updateViewarea)
  },
  teardown: function() {
    BaseViewer.prototype.teardown.apply(this)
    $(window).off('scalechange.pdfPreviewView', this.scaleChangeListener)
    this._enableScroll()
    this.viewer.watchScrollEnd(this.fileBody)
    this.stopListening()

    this.viewer.close()
  },
  getBackground: function() {
    return this.$el.add('#viewer')
  },

  scrollCenter: function() {
    const $container = $(this.viewer.el.container)
    const containerWidth = $container.width()
    const $currentPage = $(this.viewer.pages[this.viewer.page].el)
    const currentPageWidth = $currentPage.width()
    if (currentPageWidth < containerWidth) {
      return
    }
    const offsetLeft = (currentPageWidth - containerWidth) / 2
    $container.scrollLeft(offsetLeft)
  },

  zoomFit: function() {
    if (this.viewer.currentScaleValue === SCALE.PAGE_WIDTH) {
      this.viewer.setScale(this.viewer.recentScaleValue)
      this.viewer.currentScaleValue = this.viewer.recentScaleValue
    } else {
      this.viewer.recentScaleValue = this.viewer.currentScaleValue
      this.viewer.setScale(SCALE.PAGE_WIDTH)
      this.viewer.currentScaleValue = SCALE.PAGE_WIDTH
    }
  },
  zoomIn: function() {
    this.viewer.zoomIn()
    this.scrollCenter()
  },
  zoomOut: function() {
    this.viewer.zoomOut()
    this.scrollCenter()
  },
  render: function() {

    this.$el.html(_templateStore.get('PDFViewer.preview')())

    this.viewer.setContainer({
      container: this.el,
      viewer: this.$el.find('#viewer')[0],
      outerContainer: this.$el.find('#outerContainer')[0]
    })
    this._openViewer(this._fileViewer.getConfig().pdfTransportFactory)

    return this
  },
  renderAnnotations: function(PinsView) {
    const annotations = this.model.get('annotations')
    const layerBuilder = new AnnotationLayerBuilder({
      annotations: annotations,
      fileViewer: this._fileViewer,
      PinsView: PinsView
    })

    this.viewer.addLayerBuilder(layerBuilder.create())

    const that = this
    this.listenTo(annotations, 'add remove reset sync', function() {
      layerBuilder.updateAnnotations(annotations)
    })

    this.listenTo(annotations, 'selected', function(item) {
      if (item) {
        let pageNumber = item.attributes.pageNumber
        if (pageNumber > that.viewer.pages.length) {
          pageNumber = that.viewer.pages.length
        }
        if (that.viewer.pages && that.viewer.pages[pageNumber - 1]) {
          that.viewer.pages[pageNumber - 1].scrollIntoView([null, { name: 'Fit' }])
        }
      }
    })
  },

  _openViewer: function(pdfTransportFactory) {
    if (!window.ArrayBuffer) {
      const err = new Error()
      err.title = '您的浏览器不能预览此文件。'
      err.description = '您必须下载该文件，或使用一个不同的浏览器进行查看。'
      err.icon = 'cp-pdf-icon'
      this.trigger('viewerFail', err)
      return
    }

    const createPdfTransportPromise = function() {
      return when(pdfTransportFactory && pdfTransportFactory(this._fileViewer.getCurrentFile()))
    }.bind(this)

    const viewerFailed = function(oldErr) {
      const err = createPdfError(oldErr, this.model)
      this.trigger('viewerFail', err)
    }.bind(this)

    const viewerSucceeded = function(pdfTransport) {

      const defaultScale = pdfProperty[presentationMode.active ? 'DEFAULT_SCALE_PRESENTATION' : 'DEFAULT_SCALE']
      const passwordLayer = this._fileViewer._view.fileContentView.getLayerForName('password')
      this.viewer.openFile(this._previewSrc, defaultScale, undefined, passwordLayer, pdfTransport)
        .then(function() {
          this.trigger('viewerReady')
        }.bind(this), viewerFailed)
    }.bind(this)

    createPdfTransportPromise()
      .done(viewerSucceeded)
      .fail(viewerFailed)
  },

  goToPreviousPage: function() {
    this.viewer.goToPreviousPage()
  },

  goToNextPage: function() {
    this.viewer.goToNextPage()
  },

  hasPreviousPage: function() {
    return this.viewer.page > 1
  },

  hasNextPage: function() {
    return this.viewer.page < this.viewer.pages.length
  },

  _preventDefault: function(e) {
    e = e || window.event
    if (e.preventDefault) {
      e.preventDefault()
    }
    e.returnValue = false
  },

  _disableScroll: function() {
    window.addEventListener('DOMMouseScroll', this._preventDefault, false)
    window.onmousewheel = document.onmousewheel = this._preventDefault
    $('#cp-pdf-preview').addClass('hide-scrollbar')
  },

  _enableScroll: function() {
    window.removeEventListener('DOMMouseScroll', this._preventDefault, false)
    window.onmousewheel = document.onmousewheel = null
    $('#cp-pdf-preview').removeClass('hide-scrollbar')
  },

  _setPagePadding: function() {
    let pagePadding
    if (presentationMode.active) {
      pagePadding = { x: 0, y: 0 }
    } else {
      pagePadding = {
        x: pdfProperty.SCROLLBAR_PADDING,
        y: pdfProperty.VERTICAL_PADDING
      }
      const arrowLayer = this._fileViewer.getView().fileContentView.getLayerForName('arrows')
      if (arrowLayer.showsArrow()) {
        pagePadding.x = pdfProperty.NAVIGATION_ARROW_PADDING
      }
    }
    this.viewer.setPagePadding(pagePadding)
  },

  setupMode: function(mode, isModeChanged) {
    if (mode === 'PRESENTATION') {
      presentationMode.active = true
      this._disableScroll()
    } else {
      presentationMode.active = false
      this._enableScroll()
    }

    this._setPagePadding()

    if (isModeChanged) {
      this._scaleGraduallyToFitPage()
    }
  },

  _scaleGraduallyToFitPage: function() {
    let times = 0
    const fullScreenInProgress = setInterval(function() {
      times++
      if (times === 11) {
        clearInterval(fullScreenInProgress)
        this.viewer.goToPage(this.viewer.page)
      }
      this._scaleToFitPage()
    }.bind(this), 100)
  },

  _scaleToFitPage: function() {
    this.viewer.setScale(SCALE.PAGE_FIT, true)
    this.viewer.currentScaleValue = SCALE.PAGE_FIT
  },

  annotationOptions: {
    dropTarget: '#viewer .page .annotationLayer',
    annotationCreated: function(elem) {
      const $elem = $(elem)
      return {
        pageNumber: parseInt($elem.closest('.page').attr('data-page-number'), 10)
      }
    }
  }
})

export default PDFView

