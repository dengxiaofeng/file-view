import { pdfProperty } from './pdf-properties'

var PDFJS = window.PDFJS
var CustomStyle = PDFJS.CustomStyle

function TextLayerBuilder(options) {
  this.textLayerDiv = options.textLayerDiv;
  this.layoutDone = false;
  this.divContentDone = false;
  this.pageIdx = options.pageIndex;
  this.matches = [];
  this.lastScrollSource = options.lastScrollSource || null;
  this.viewport = options.viewport;
  this.isViewerInPresentationMode = options.isViewerInPresentationMode;
  this.textDivs = [];
  this.findController = window.PDFFindController || null;
}


TextLayerBuilder.prototype.renderLayer = function () {
  var textLayerFrag = document.createDocumentFragment();
  var textDivs = this.textDivs;
  var textDivsLength = textDivs.length;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  // No point in rendering many divs as it would make the browser
  // unusable even after the divs are rendered.
  if (textDivsLength > pdfProperty.MAX_TEXT_DIVS_TO_RENDER) {
    return;
  }

  for (var i = 0; i < textDivsLength; i++) {
    var textDiv = textDivs[ i ];
    if (textDiv.dataset.isWhitespace !== undefined) {
      continue;
    }

    ctx.font = textDiv.style.fontSize + ' ' + textDiv.style.fontFamily;
    var width = ctx.measureText(textDiv.textContent).width;
    if (width > 0) {
      textLayerFrag.appendChild(textDiv);
      var textScale = textDiv.dataset.canvasWidth / width;
      var rotation = textDiv.dataset.angle;
      var transform = 'scale(' + textScale + ', 1)';
      transform = 'rotate(' + rotation + 'deg) ' + transform;
      CustomStyle.setProp('transform', textDiv, transform);
      CustomStyle.setProp('transformOrigin', textDiv, '0% 0%');
    }
  }

  this.textLayerDiv.appendChild(textLayerFrag);
  this.renderingDone = true;
}

TextLayerBuilder.prototype.setupRenderLayoutTimer = function () {
  var self = this;
  var lastScroll = (this.lastScrollSource === null ? 0 : this.lastScrollSource.lastScroll);

  if (Date.now() - lastScroll > pdfProperty.RENDER_DELAY) { // Render right away
    this.renderLayer();
  } else { // Schedule
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
    }
    this.renderTimer = setTimeout(function () {
      self.setupRenderLayoutTimer();
    }, pdfProperty.RENDER_DELAY);
  }
}

TextLayerBuilder.prototype.appendText = function (geom, styles) {
  var style = styles[ geom.fontName ];
  var textDiv = document.createElement('div');
  this.textDivs.push(textDiv);
  if (!/\S/.test(geom.str)) {
    textDiv.dataset.isWhitespace = true;
    return;
  }
  var tx = PDFJS.Util.transform(this.viewport.transform, geom.transform);
  var angle = Math.atan2(tx[ 1 ], tx[ 0 ]);
  if (style.vertical) {
    angle += Math.PI / 2;
  }
  var fontHeight = Math.sqrt((tx[ 2 ] * tx[ 2 ]) + (tx[ 3 ] * tx[ 3 ]));
  var fontAscent = (style.ascent ? style.ascent * fontHeight :
    (style.descent ? (1 + style.descent) * fontHeight : fontHeight));

  textDiv.style.position = 'absolute';
  textDiv.style.left = (tx[ 4 ] + (fontAscent * Math.sin(angle))) + 'px';
  textDiv.style.top = (tx[ 5 ] - (fontAscent * Math.cos(angle))) + 'px';
  textDiv.style.fontSize = fontHeight + 'px';
  textDiv.style.fontFamily = style.fontFamily;

  textDiv.textContent = geom.str;
  textDiv.dataset.fontName = geom.fontName;
  textDiv.dataset.angle = angle * (180 / Math.PI);
  if (style.vertical) {
    textDiv.dataset.canvasWidth = geom.height * this.viewport.scale;
  } else {
    textDiv.dataset.canvasWidth = geom.width * this.viewport.scale;
  }
}

TextLayerBuilder.prototype.setTextContent=function (textContent) {
  this.textContent = textContent;

  var textItems = textContent.items;
  for (var i = 0, len = textItems.length; i < len; i++) {
    this.appendText(textItems[i], textContent.styles);
  }
  this.divContentDone = true;
  this.setupRenderLayoutTimer();
}

export default TextLayerBuilder
