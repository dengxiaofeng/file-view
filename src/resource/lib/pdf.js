'use strict';

// Initializing PDFJS global object here, it case if we need to change/disable
// some PDF.js features, e.g. range requests
if (typeof PDFJS === 'undefined') {
  (typeof window !== 'undefined' ? window : this).PDFJS = {};
}

// Checking if the typed arrays are supported
// Support: iOS<6.0 (subarray), IE<10, Android<4.0
(function checkTypedArrayCompatibility() {
  if (typeof Uint8Array !== 'undefined') {
    // Support: iOS<6.0
    if (typeof Uint8Array.prototype.subarray === 'undefined') {
      Uint8Array.prototype.subarray = function subarray(start, end) {
        return new Uint8Array(this.slice(start, end));
      };
      Float32Array.prototype.subarray = function subarray(start, end) {
        return new Float32Array(this.slice(start, end));
      };
    }

    // Support: Android<4.1
    if (typeof Float64Array === 'undefined') {
      window.Float64Array = Float32Array;
    }
    return;
  }

  function subarray(start, end) {
    return new TypedArray(this.slice(start, end));
  }

  function setArrayOffset(array, offset) {
    if (arguments.length < 2) {
      offset = 0;
    }
    for (var i = 0, n = array.length; i < n; ++i, ++offset) {
      this[ offset ] = array[ i ] & 0xFF;
    }
  }

  function TypedArray(arg1) {
    var result, i, n;
    if (typeof arg1 === 'number') {
      result = [];
      for (i = 0; i < arg1; ++i) {
        result[ i ] = 0;
      }
    } else if ('slice' in arg1) {
      result = arg1.slice(0);
    } else {
      result = [];
      for (i = 0, n = arg1.length; i < n; ++i) {
        result[ i ] = arg1[ i ];
      }
    }

    result.subarray = subarray;
    result.buffer = result;
    result.byteLength = result.length;
    result.set = setArrayOffset;

    if (typeof arg1 === 'object' && arg1.buffer) {
      result.buffer = arg1.buffer;
    }
    return result;
  }

  window.Uint8Array = TypedArray;
  window.Int8Array = TypedArray;

  // we don't need support for set, byteLength for 32-bit array
  // so we can use the TypedArray as well
  window.Uint32Array = TypedArray;
  window.Int32Array = TypedArray;
  window.Uint16Array = TypedArray;
  window.Float32Array = TypedArray;
  window.Float64Array = TypedArray;
})();

// URL = URL || webkitURL
// Support: Safari<7, Android 4.2+
(function normalizeURLObject() {
  if (!window.URL) {
    window.URL = window.webkitURL;
  }
})();

// Object.defineProperty()?
// Support: Android<4.0, Safari<5.1
(function checkObjectDefinePropertyCompatibility() {
  if (typeof Object.defineProperty !== 'undefined') {
    var definePropertyPossible = true;
    try {
      // some browsers (e.g. safari) cannot use defineProperty() on DOM objects
      // and thus the native version is not sufficient
      Object.defineProperty(new Image(), 'id', {value: 'test'});
      // ... another test for android gb browser for non-DOM objects
      var Test = function Test() {
      };
      Test.prototype = {
        get id() {
        }
      };
      Object.defineProperty(new Test(), 'id',
        {value: '', configurable: true, enumerable: true, writable: false});
    } catch (e) {
      definePropertyPossible = false;
    }
    if (definePropertyPossible) {
      return;
    }
  }

  Object.defineProperty = function objectDefineProperty(obj, name, def) {
    delete obj[ name ];
    if ('get' in def) {
      obj.__defineGetter__(name, def[ 'get' ]);
    }
    if ('set' in def) {
      obj.__defineSetter__(name, def[ 'set' ]);
    }
    if ('value' in def) {
      obj.__defineSetter__(name, function objectDefinePropertySetter(value) {
        this.__defineGetter__(name, function objectDefinePropertyGetter() {
          return value;
        });
        return value;
      });
      obj[ name ] = def.value;
    }
  };
})();


// No XMLHttpRequest#response?
// Support: IE<11, Android <4.0
(function checkXMLHttpRequestResponseCompatibility() {
  var xhrPrototype = XMLHttpRequest.prototype;
  var xhr = new XMLHttpRequest();
  if (!('overrideMimeType' in xhr)) {
    // IE10 might have response, but not overrideMimeType
    // Support: IE10
    Object.defineProperty(xhrPrototype, 'overrideMimeType', {
      value: function xmlHttpRequestOverrideMimeType(mimeType) {
      }
    });
  }
  if ('responseType' in xhr) {
    return;
  }

  // The worker will be using XHR, so we can save time and disable worker.
  PDFJS.disableWorker = true;

  Object.defineProperty(xhrPrototype, 'responseType', {
    get: function xmlHttpRequestGetResponseType() {
      return this._responseType || 'text';
    },
    set: function xmlHttpRequestSetResponseType(value) {
      if (value === 'text' || value === 'arraybuffer') {
        this._responseType = value;
        if (value === 'arraybuffer' &&
          typeof this.overrideMimeType === 'function') {
          this.overrideMimeType('text/plain; charset=x-user-defined');
        }
      }
    }
  });

  // Support: IE9
  if (typeof VBArray !== 'undefined') {
    Object.defineProperty(xhrPrototype, 'response', {
      get: function xmlHttpRequestResponseGet() {
        if (this.responseType === 'arraybuffer') {
          return new Uint8Array(new VBArray(this.responseBody).toArray());
        } else {
          return this.responseText;
        }
      }
    });
    return;
  }

  Object.defineProperty(xhrPrototype, 'response', {
    get: function xmlHttpRequestResponseGet() {
      if (this.responseType !== 'arraybuffer') {
        return this.responseText;
      }
      var text = this.responseText;
      var i, n = text.length;
      var result = new Uint8Array(n);
      for (i = 0; i < n; ++i) {
        result[ i ] = text.charCodeAt(i) & 0xFF;
      }
      return result.buffer;
    }
  });
})();

// window.btoa (base64 encode function) ?
// Support: IE<10
(function checkWindowBtoaCompatibility() {
  if ('btoa' in window) {
    return;
  }

  var digits =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  window.btoa = function windowBtoa(chars) {
    var buffer = '';
    var i, n;
    for (i = 0, n = chars.length; i < n; i += 3) {
      var b1 = chars.charCodeAt(i) & 0xFF;
      var b2 = chars.charCodeAt(i + 1) & 0xFF;
      var b3 = chars.charCodeAt(i + 2) & 0xFF;
      var d1 = b1 >> 2, d2 = ((b1 & 3) << 4) | (b2 >> 4);
      var d3 = i + 1 < n ? ((b2 & 0xF) << 2) | (b3 >> 6) : 64;
      var d4 = i + 2 < n ? (b3 & 0x3F) : 64;
      buffer += (digits.charAt(d1) + digits.charAt(d2) +
        digits.charAt(d3) + digits.charAt(d4));
    }
    return buffer;
  };
})();

// window.atob (base64 encode function)?
// Support: IE<10
(function checkWindowAtobCompatibility() {
  if ('atob' in window) {
    return;
  }

  // https://github.com/davidchambers/Base64.js
  var digits =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  window.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 === 1) {
      throw new Error('bad atob input');
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table?
      // initialize bit storage and add its ascii value
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = digits.indexOf(buffer);
    }
    return output;
  };
})();

// Function.prototype.bind?
// Support: Android<4.0, iOS<6.0
(function checkFunctionPrototypeBindCompatibility() {
  if (typeof Function.prototype.bind !== 'undefined') {
    return;
  }

  Function.prototype.bind = function functionPrototypeBind(obj) {
    var fn = this, headArgs = Array.prototype.slice.call(arguments, 1);
    var bound = function functionPrototypeBindBound() {
      var args = headArgs.concat(Array.prototype.slice.call(arguments));
      return fn.apply(obj, args);
    };
    return bound;
  };
})();

// HTMLElement dataset property
// Support: IE<11, Safari<5.1, Android<4.0
(function checkDatasetProperty() {
  var div = document.createElement('div');
  if ('dataset' in div) {
    return; // dataset property exists
  }

  Object.defineProperty(HTMLElement.prototype, 'dataset', {
    get: function () {
      if (this._dataset) {
        return this._dataset;
      }

      var dataset = {};
      for (var j = 0, jj = this.attributes.length; j < jj; j++) {
        var attribute = this.attributes[ j ];
        if (attribute.name.substring(0, 5) !== 'data-') {
          continue;
        }
        var key = attribute.name.substring(5).replace(/\-([a-z])/g,
          function (all, ch) {
            return ch.toUpperCase();
          });
        dataset[ key ] = attribute.value;
      }

      Object.defineProperty(this, '_dataset', {
        value: dataset,
        writable: false,
        enumerable: false
      });
      return dataset;
    },
    enumerable: true
  });
})();

// HTMLElement classList property
// Support: IE<10, Android<4.0, iOS<5.0
(function checkClassListProperty() {
  var div = document.createElement('div');
  if ('classList' in div) {
    return; // classList property exists
  }

  function changeList(element, itemName, add, remove) {
    var s = element.className || '';
    var list = s.split(/\s+/g);
    if (list[ 0 ] === '') {
      list.shift();
    }
    var index = list.indexOf(itemName);
    if (index < 0 && add) {
      list.push(itemName);
    }
    if (index >= 0 && remove) {
      list.splice(index, 1);
    }
    element.className = list.join(' ');
    return (index >= 0);
  }

  var classListPrototype = {
    add: function (name) {
      changeList(this.element, name, true, false);
    },
    contains: function (name) {
      return changeList(this.element, name, false, false);
    },
    remove: function (name) {
      changeList(this.element, name, false, true);
    },
    toggle: function (name) {
      changeList(this.element, name, true, true);
    }
  };

  Object.defineProperty(HTMLElement.prototype, 'classList', {
    get: function () {
      if (this._classList) {
        return this._classList;
      }

      var classList = Object.create(classListPrototype, {
        element: {
          value: this,
          writable: false,
          enumerable: true
        }
      });
      Object.defineProperty(this, '_classList', {
        value: classList,
        writable: false,
        enumerable: false
      });
      return classList;
    },
    enumerable: true
  });
})();

// Check console compatibility
// In older IE versions the console object is not available
// unless console is open.
// Support: IE<10
(function checkConsoleCompatibility() {
  if (!('console' in window)) {
    window.console = {
      log: function () {
      },
      error: function () {
      },
      warn: function () {
      }
    };
  } else if (!('bind' in console.log)) {
    // native functions in IE9 might not have bind
    console.log = (function (fn) {
      return function (msg) {
        return fn(msg);
      };
    })(console.log);
    console.error = (function (fn) {
      return function (msg) {
        return fn(msg);
      };
    })(console.error);
    console.warn = (function (fn) {
      return function (msg) {
        return fn(msg);
      };
    })(console.warn);
  }
})();

// Check onclick compatibility in Opera
// Support: Opera<15
(function checkOnClickCompatibility() {
  // workaround for reported Opera bug DSK-354448:
  // onclick fires on disabled buttons with opaque content
  function ignoreIfTargetDisabled(event) {
    if (isDisabled(event.target)) {
      event.stopPropagation();
    }
  }

  function isDisabled(node) {
    return node.disabled || (node.parentNode && isDisabled(node.parentNode));
  }

  if (navigator.userAgent.indexOf('Opera') !== -1) {
    // use browser detection since we cannot feature-check this bug
    document.addEventListener('click', ignoreIfTargetDisabled, true);
  }
})();

// Checks if possible to use URL.createObjectURL()
// Support: IE
(function checkOnBlobSupport() {
  // sometimes IE loosing the data created with createObjectURL(), see #3977
  if (navigator.userAgent.indexOf('Trident') >= 0) {
    PDFJS.disableCreateObjectURL = true;
  }
})();

// Checks if navigator.language is supported
(function checkNavigatorLanguage() {
  if ('language' in navigator) {
    return;
  }
  PDFJS.locale = navigator.userLanguage || 'en-US';
})();

(function checkRangeRequests() {
  // Safari has issues with cached range requests see:
  // https://github.com/mozilla/pdf.js/issues/3260
  // Last tested with version 6.0.4.
  // Support: Safari 6.0+
  var isSafari = Object.prototype.toString.call(
    window.HTMLElement).indexOf('Constructor') > 0;

  // Older versions of Android (pre 3.0) has issues with range requests, see:
  // https://github.com/mozilla/pdf.js/issues/3381.
  // Make sure that we only match webkit-based Android browsers,
  // since Firefox/Fennec works as expected.
  // Support: Android<3.0
  var regex = /Android\s[0-2][^\d]/;
  var isOldAndroid = regex.test(navigator.userAgent);

  // Range requests are broken in Chrome 39 and 40, https://crbug.com/442318
  var isChromeWithRangeBug = /Chrome\/(39|40)\./.test(navigator.userAgent);

  if (isSafari || isOldAndroid || isChromeWithRangeBug) {
    PDFJS.disableRange = true;
    PDFJS.disableStream = true;
  }
})();

// Check if the browser supports manipulation of the history.
// Support: IE<10, Android<4.2
(function checkHistoryManipulation() {
  // Android 2.x has so buggy pushState support that it was removed in
  // Android 3.0 and restored as late as in Android 4.2.
  // Support: Android 2.x
  if (!history.pushState || navigator.userAgent.indexOf('Android 2.') >= 0) {
    PDFJS.disableHistory = true;
  }
})();

// Support: IE<11, Chrome<21, Android<4.4, Safari<6
(function checkSetPresenceInImageData() {
  // IE < 11 will use window.CanvasPixelArray which lacks set function.
  if (window.CanvasPixelArray) {
    if (typeof window.CanvasPixelArray.prototype.set !== 'function') {
      window.CanvasPixelArray.prototype.set = function (arr) {
        for (var i = 0, ii = this.length; i < ii; i++) {
          this[ i ] = arr[ i ];
        }
      };
    }
  } else {
    // Old Chrome and Android use an inaccessible CanvasPixelArray prototype.
    // Because we cannot feature detect it, we rely on user agent parsing.
    var polyfill = false, versionMatch;
    if (navigator.userAgent.indexOf('Chrom') >= 0) {
      versionMatch = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
      // Chrome < 21 lacks the set function.
      polyfill = versionMatch && parseInt(versionMatch[ 2 ]) < 21;
    } else if (navigator.userAgent.indexOf('Android') >= 0) {
      // Android < 4.4 lacks the set function.
      // Android >= 4.4 will contain Chrome in the user agent,
      // thus pass the Chrome check above and not reach this block.
      polyfill = /Android\s[0-4][^\d]/g.test(navigator.userAgent);
    } else if (navigator.userAgent.indexOf('Safari') >= 0) {
      versionMatch = navigator.userAgent.match(/Version\/([0-9]+)\.([0-9]+)\.([0-9]+) Safari\//);
      // Safari < 6 lacks the set function.
      polyfill = versionMatch && parseInt(versionMatch[ 1 ]) < 6;
    }

    if (polyfill) {
      var contextPrototype = window.CanvasRenderingContext2D.prototype;
      var createImageData = contextPrototype.createImageData;
      contextPrototype.createImageData = function (w, h) {
        var imageData = createImageData.call(this, w, h);
        imageData.data.set = function (arr) {
          for (var i = 0, ii = this.length; i < ii; i++) {
            this[ i ] = arr[ i ];
          }
        };
        return imageData;
      };
      // this closure will be kept referenced, so clear its vars
      contextPrototype = null;
    }
  }
})();

// Support: IE<10, Android<4.0, iOS
(function checkRequestAnimationFrame() {
  function fakeRequestAnimationFrame(callback) {
    window.setTimeout(callback, 20);
  }

  var isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  if (isIOS) {
    // requestAnimationFrame on iOS is broken, replacing with fake one.
    window.requestAnimationFrame = fakeRequestAnimationFrame;
    return;
  }
  if ('requestAnimationFrame' in window) {
    return;
  }
  window.requestAnimationFrame =
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    fakeRequestAnimationFrame;
})();

(function checkCanvasSizeLimitation() {
  var isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  var isAndroid = /Android/g.test(navigator.userAgent);
  if (isIOS || isAndroid) {
    // 5MP
    PDFJS.maxCanvasPixels = 5242880;
  }
})();

// Disable fullscreen support for certain problematic configurations.
// Support: IE11+ (when embedded).
(function checkFullscreenSupport() {
  var isEmbeddedIE = (navigator.userAgent.indexOf('Trident') >= 0 &&
    window.parent !== window);
  if (isEmbeddedIE) {
    PDFJS.disableFullscreen = true;
  }
})();

// Provides document.currentScript support
// Support: IE, Chrome<29.
(function checkCurrentScript() {
  if ('currentScript' in document) {
    return;
  }
  Object.defineProperty(document, 'currentScript', {
    get: function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[ scripts.length - 1 ];
    },
    enumerable: true,
    configurable: true
  });
})();
;
;
/* module-key = 'com.atlassian.jira.jira-fileviewer-plugin:fileviewer-pdf', location = 'node_modules/@atlassian/fileviewer/vendor/pdfjs/pdf.min.js' */
(function (B, S) {
  'function' === typeof define && define.amd ? define('pdfjs-dist/build/pdf', [ 'exports' ], S) : 'undefined' !== typeof exports ? S(exports) : S(B.pdfjsDistBuildPdf = {})
})(this, function (B) {
  var S = 'undefined' !== typeof document && document.currentScript ? document.currentScript.src : null, K = {};
  (function () {
    (function (c, e) {
      e(c.pdfjsSharedUtil = {})
    })(this, function (c) {
      function e(b) {
        A >= d.warnings && console.log('Warning: ' + b)
      }

      function u(b) {
        A >= d.errors && (console.log('Error: ' + b), console.log(y()));
        throw Error(b);
      }

      function y() {
        try {
          throw Error();
        } catch (b) {
          return b.stack ? b.stack.split('\n').slice(2).join('\n') : ''
        }
      }

      function F(b, a) {
        b || u(a)
      }

      function l(b) {
        F('string' === typeof b, 'Invalid argument for stringToBytes');
        for (var a = b.length, f = new Uint8Array(a), H = 0; H < a; ++H) f[ H ] = b.charCodeAt(H) & 255;
        return f
      }

      function C(b) {
        if (void 0 !== b.length) return b.length;
        F(void 0 !== b.byteLength);
        return b.byteLength
      }

      function V(b) {
        return 'number' === typeof b && (b | 0) === b
      }

      function N() {
        var b = {};
        b.promise = new Promise(function (a, f) {
          b.resolve = a;
          b.reject = f
        });
        return b
      }

      function I(b,
                 a, f) {
        this.sourceName = b;
        this.targetName = a;
        this.comObj = f;
        this.callbackIndex = 1;
        this.postMessageTransfers = !0;
        var H = this.callbacksCapabilities = Object.create(null), O = this.actionHandler = Object.create(null);
        this._onComObjOnMessage = function (b) {
          var a = b.data;
          if (a.targetName === this.sourceName) if (a.isReply) if (b = a.callbackId, a.callbackId in H) {
            var g = H[ b ];
            delete H[ b ];
            'error' in a ? g.reject(a.error) : g.resolve(a.data)
          } else u('Cannot resolve callback ' + b); else if (a.action in O) {
            var k = O[ a.action ];
            if (a.callbackId) {
              var r =
                this.sourceName, h = a.sourceName;
              Promise.resolve().then(function () {
                return k[ 0 ].call(k[ 1 ], a.data)
              }).then(function (b) {
                f.postMessage({sourceName: r, targetName: h, isReply: !0, callbackId: a.callbackId, data: b})
              }, function (b) {
                b instanceof Error && (b += '');
                f.postMessage({sourceName: r, targetName: h, isReply: !0, callbackId: a.callbackId, error: b})
              })
            } else k[ 0 ].call(k[ 1 ], a.data)
          } else u('Unknown action from worker: ' + a.action)
        }.bind(this);
        f.addEventListener('message', this._onComObjOnMessage)
      }

      var E = 'undefined' !== typeof window ?
        window : 'undefined' !== typeof global ? global : 'undefined' !== typeof self ? self : this,
        d = {errors: 0, warnings: 1, infos: 5}, A = d.warnings, a = function () {
          function b(b, a) {
            this.name = 'PasswordException';
            this.message = b;
            this.code = a
          }

          b.prototype = Error();
          return b.constructor = b
        }(), x = function () {
          function b(b, a) {
            this.name = 'UnknownErrorException';
            this.message = b;
            this.details = a
          }

          b.prototype = Error();
          return b.constructor = b
        }(), p = function () {
          function b(b) {
            this.name = 'InvalidPDFException';
            this.message = b
          }

          b.prototype = Error();
          return b.constructor =
            b
        }(), v = function () {
          function b(b) {
            this.name = 'MissingPDFException';
            this.message = b
          }

          b.prototype = Error();
          return b.constructor = b
        }(), D = function () {
          function b(b, a) {
            this.name = 'UnexpectedResponseException';
            this.message = b;
            this.status = a
          }

          b.prototype = Error();
          return b.constructor = b
        }(), m = function () {
          function b(b) {
            this.message = b
          }

          b.prototype = Error();
          b.prototype.name = 'NotImplementedException';
          return b.constructor = b
        }(), t = function () {
          function b(b, a) {
            this.begin = b;
            this.end = a;
            this.message = 'Missing data [' + b + ', ' + a + ')'
          }

          b.prototype =
            Error();
          b.prototype.name = 'MissingDataException';
          return b.constructor = b
        }(), n = function () {
          function b(b) {
            this.message = b
          }

          b.prototype = Error();
          b.prototype.name = 'XRefParseException';
          return b.constructor = b
        }(), z = /\x00/g, k = function () {
          function b(H, O) {
            this.buffer = H;
            this.byteLength = H.length;
            for (var k = this.length = void 0 === O ? this.byteLength >> 2 : O; f < k;) Object.defineProperty(b.prototype, f, a(f)), f++
          }

          function a(b) {
            return {
              get: function () {
                var a = this.buffer, f = b << 2;
                return (a[ f ] | a[ f + 1 ] << 8 | a[ f + 2 ] << 16 | a[ f + 3 ] << 24) >>> 0
              }, set: function (a) {
                var f =
                  this.buffer, k = b << 2;
                f[ k ] = a & 255;
                f[ k + 1 ] = a >> 8 & 255;
                f[ k + 2 ] = a >> 16 & 255;
                f[ k + 3 ] = a >>> 24 & 255
              }
            }
          }

          b.prototype = Object.create(null);
          var f = 0;
          return b
        }();
      c.Uint32ArrayView = k;
      var r = function () {
          function b() {
          }

          var a = [ 'rgb(', 0, ',', 0, ',', 0, ')' ];
          b.makeCssRgb = function (b, f, k) {
            a[ 1 ] = b;
            a[ 3 ] = f;
            a[ 5 ] = k;
            return a.join('')
          };
          b.transform = function (b, a) {
            return [ b[ 0 ] * a[ 0 ] + b[ 2 ] * a[ 1 ], b[ 1 ] * a[ 0 ] + b[ 3 ] * a[ 1 ], b[ 0 ] * a[ 2 ] + b[ 2 ] * a[ 3 ], b[ 1 ] * a[ 2 ] + b[ 3 ] * a[ 3 ], b[ 0 ] * a[ 4 ] + b[ 2 ] * a[ 5 ] + b[ 4 ], b[ 1 ] * a[ 4 ] + b[ 3 ] * a[ 5 ] + b[ 5 ] ]
          };
          b.applyTransform = function (b, a) {
            return [ b[ 0 ] * a[ 0 ] +
            b[ 1 ] * a[ 2 ] + a[ 4 ], b[ 0 ] * a[ 1 ] + b[ 1 ] * a[ 3 ] + a[ 5 ] ]
          };
          b.applyInverseTransform = function (b, a) {
            var f = a[ 0 ] * a[ 3 ] - a[ 1 ] * a[ 2 ];
            return [ (b[ 0 ] * a[ 3 ] - b[ 1 ] * a[ 2 ] + a[ 2 ] * a[ 5 ] - a[ 4 ] * a[ 3 ]) / f, (-b[ 0 ] * a[ 1 ] + b[ 1 ] * a[ 0 ] + a[ 4 ] * a[ 1 ] - a[ 5 ] * a[ 0 ]) / f ]
          };
          b.getAxialAlignedBoundingBox = function (a, f) {
            var k = b.applyTransform(a, f), g = b.applyTransform(a.slice(2, 4), f),
              r = b.applyTransform([ a[ 0 ], a[ 3 ] ], f), h = b.applyTransform([ a[ 2 ], a[ 1 ] ], f);
            return [ Math.min(k[ 0 ], g[ 0 ], r[ 0 ], h[ 0 ]), Math.min(k[ 1 ], g[ 1 ], r[ 1 ], h[ 1 ]), Math.max(k[ 0 ], g[ 0 ], r[ 0 ], h[ 0 ]), Math.max(k[ 1 ], g[ 1 ], r[ 1 ], h[ 1 ]) ]
          };
          b.inverseTransform = function (b) {
            var a = b[ 0 ] * b[ 3 ] - b[ 1 ] * b[ 2 ];
            return [ b[ 3 ] / a, -b[ 1 ] / a, -b[ 2 ] / a, b[ 0 ] / a, (b[ 2 ] * b[ 5 ] - b[ 4 ] * b[ 3 ]) / a, (b[ 4 ] * b[ 1 ] - b[ 5 ] * b[ 0 ]) / a ]
          };
          b.apply3dTransform = function (b, a) {
            return [ b[ 0 ] * a[ 0 ] + b[ 1 ] * a[ 1 ] + b[ 2 ] * a[ 2 ], b[ 3 ] * a[ 0 ] + b[ 4 ] * a[ 1 ] + b[ 5 ] * a[ 2 ], b[ 6 ] * a[ 0 ] + b[ 7 ] * a[ 1 ] + b[ 8 ] * a[ 2 ] ]
          };
          b.singularValueDecompose2dScale = function (b) {
            var a = [ b[ 0 ], b[ 2 ], b[ 1 ], b[ 3 ] ], f = b[ 0 ] * a[ 0 ] + b[ 1 ] * a[ 2 ],
              k = b[ 2 ] * a[ 1 ] + b[ 3 ] * a[ 3 ], g = (f + k) / 2;
            b = Math.sqrt((f + k) * (f + k) - 4 * (f * k - (b[ 2 ] * a[ 0 ] + b[ 3 ] * a[ 2 ]) * (b[ 0 ] * a[ 1 ] + b[ 1 ] * a[ 3 ]))) / 2;
            a = g - b || 1;
            return [ Math.sqrt(g +
              b || 1), Math.sqrt(a) ]
          };
          b.normalizeRect = function (b) {
            var a = b.slice(0);
            b[ 0 ] > b[ 2 ] && (a[ 0 ] = b[ 2 ], a[ 2 ] = b[ 0 ]);
            b[ 1 ] > b[ 3 ] && (a[ 1 ] = b[ 3 ], a[ 3 ] = b[ 1 ]);
            return a
          };
          b.intersect = function (a, f) {
            function k(b, a) {
              return b - a
            }

            var g = [ a[ 0 ], a[ 2 ], f[ 0 ], f[ 2 ] ].sort(k), r = [ a[ 1 ], a[ 3 ], f[ 1 ], f[ 3 ] ].sort(k), h = [];
            a = b.normalizeRect(a);
            f = b.normalizeRect(f);
            if (g[ 0 ] === a[ 0 ] && g[ 1 ] === f[ 0 ] || g[ 0 ] === f[ 0 ] && g[ 1 ] === a[ 0 ]) h[ 0 ] = g[ 1 ], h[ 2 ] = g[ 2 ]; else return !1;
            if (r[ 0 ] === a[ 1 ] && r[ 1 ] === f[ 1 ] || r[ 0 ] === f[ 1 ] && r[ 1 ] === a[ 1 ]) h[ 1 ] = r[ 1 ], h[ 3 ] = r[ 2 ]; else return !1;
            return h
          };
          b.sign =
            function (b) {
              return 0 > b ? -1 : 1
            };
          var f = ' C CC CCC CD D DC DCC DCCC CM  X XX XXX XL L LX LXX LXXX XC  I II III IV V VI VII VIII IX'.split(' ');
          b.toRoman = function (b, a) {
            F(V(b) && 0 < b, 'The number should be a positive integer.');
            for (var k, g = []; 1E3 <= b;) b -= 1E3, g.push('M');
            k = b / 100 | 0;
            b %= 100;
            g.push(f[ k ]);
            k = b / 10 | 0;
            b %= 10;
            g.push(f[ 10 + k ]);
            g.push(f[ 20 + b ]);
            k = g.join('');
            return a ? k.toLowerCase() : k
          };
          b.appendToArray = function (b, a) {
            Array.prototype.push.apply(b, a)
          };
          b.prependToArray = function (b, a) {
            Array.prototype.unshift.apply(b,
              a)
          };
          b.extendObj = function (b, a) {
            for (var f in a) b[ f ] = a[ f ]
          };
          b.getInheritableProperty = function (b, a) {
            for (; b && !b.has(a);) b = b.get('Parent');
            return b ? b.get(a) : null
          };
          b.inherit = function (b, a, f) {
            b.prototype = Object.create(a.prototype);
            b.prototype.constructor = b;
            for (var k in f) b.prototype[ k ] = f[ k ]
          };
          b.loadScript = function (b, a) {
            var f = document.createElement('script'), k = !1;
            f.setAttribute('src', b);
            a && (f.onload = function () {
              k || a();
              k = !0
            });
            document.getElementsByTagName('head')[ 0 ].appendChild(f)
          };
          return b
        }(), k = function () {
          function b(b,
                     a, f, k, g, r) {
            this.viewBox = b;
            this.scale = a;
            this.rotation = f;
            this.offsetX = k;
            this.offsetY = g;
            var h = (b[ 2 ] + b[ 0 ]) / 2, p = (b[ 3 ] + b[ 1 ]) / 2, d, n, x;
            f %= 360;
            switch (0 > f ? f + 360 : f) {
              case 180:
                f = -1;
                n = d = 0;
                x = 1;
                break;
              case 90:
                f = 0;
                n = d = 1;
                x = 0;
                break;
              case 270:
                f = 0;
                n = d = -1;
                x = 0;
                break;
              default:
                f = 1, n = d = 0, x = -1
            }
            r && (n = -n, x = -x);
            0 === f ? (k = Math.abs(p - b[ 1 ]) * a + k, g = Math.abs(h - b[ 0 ]) * a + g, r = Math.abs(b[ 3 ] - b[ 1 ]) * a, b = Math.abs(b[ 2 ] - b[ 0 ]) * a) : (k = Math.abs(h - b[ 0 ]) * a + k, g = Math.abs(p - b[ 1 ]) * a + g, r = Math.abs(b[ 2 ] - b[ 0 ]) * a, b = Math.abs(b[ 3 ] - b[ 1 ]) * a);
            this.transform = [ f * a, d * a,
              n * a, x * a, k - f * a * h - n * a * p, g - d * a * h - x * a * p ];
            this.width = r;
            this.height = b;
            this.fontScale = a
          }

          b.prototype = {
            clone: function (a) {
              a = a || {};
              var f = 'scale' in a ? a.scale : this.scale, k = 'rotation' in a ? a.rotation : this.rotation;
              return new b(this.viewBox.slice(), f, k, this.offsetX, this.offsetY, a.dontFlip)
            }, convertToViewportPoint: function (b, a) {
              return r.applyTransform([ b, a ], this.transform)
            }, convertToViewportRectangle: function (b) {
              var a = r.applyTransform([ b[ 0 ], b[ 1 ] ], this.transform);
              b = r.applyTransform([ b[ 2 ], b[ 3 ] ], this.transform);
              return [ a[ 0 ],
                a[ 1 ], b[ 0 ], b[ 1 ] ]
            }, convertToPdfPoint: function (b, a) {
              return r.applyInverseTransform([ b, a ], this.transform)
            }
          };
          return b
        }(),
        g = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 728, 711, 710, 729, 733, 731, 730, 732, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8226, 8224, 8225, 8230, 8212, 8211, 402, 8260, 8249, 8250, 8722, 8240, 8222, 8220, 8221, 8216, 8217, 8218, 8482, 64257, 64258, 321,
          338, 352, 376, 381, 305, 322, 339, 353, 382, 0, 8364 ];
      (function () {
        function b(b) {
          this._status = 0;
          this._handlers = [];
          try {
            b.call(this, this._resolve.bind(this), this._reject.bind(this))
          } catch (a) {
            this._reject(a)
          }
        }

        if (E.Promise) 'function' !== typeof E.Promise.all && (E.Promise.all = function (b) {
          var a = 0, f = [], k, g, r = new E.Promise(function (b, a) {
            k = b;
            g = a
          });
          b.forEach(function (b, r) {
            a++;
            b.then(function (b) {
              f[ r ] = b;
              a--;
              0 === a && k(f)
            }, g)
          });
          0 === a && k(f);
          return r
        }), 'function' !== typeof E.Promise.resolve && (E.Promise.resolve = function (b) {
          return new E.Promise(function (a) {
            a(b)
          })
        }),
        'function' !== typeof E.Promise.reject && (E.Promise.reject = function (b) {
          return new E.Promise(function (a, f) {
            f(b)
          })
        }), 'function' !== typeof E.Promise.prototype.catch && (E.Promise.prototype.catch = function (b) {
          return E.Promise.prototype.then(void 0, b)
        }); else {
          var a = {
            handlers: [],
            running: !1,
            unhandledRejections: [],
            pendingRejectionCheck: !1,
            scheduleHandlers: function (b) {
              0 !== b._status && (this.handlers = this.handlers.concat(b._handlers), b._handlers = [], this.running || (this.running = !0, setTimeout(this.runHandlers.bind(this),
                0)))
            },
            runHandlers: function () {
              for (var b = Date.now() + 1; 0 < this.handlers.length;) {
                var a = this.handlers.shift(), f = a.thisPromise._status, k = a.thisPromise._value;
                try {
                  1 === f ? 'function' === typeof a.onResolve && (k = a.onResolve(k)) : 'function' === typeof a.onReject && (k = a.onReject(k), f = 1, a.thisPromise._unhandledRejection && this.removeUnhandeledRejection(a.thisPromise))
                } catch (g) {
                  f = 2, k = g
                }
                a.nextPromise._updateStatus(f, k);
                if (Date.now() >= b) break
              }
              0 < this.handlers.length ? setTimeout(this.runHandlers.bind(this), 0) : this.running = !1
            },
            addUnhandledRejection: function (b) {
              this.unhandledRejections.push({promise: b, time: Date.now()});
              this.scheduleRejectionCheck()
            },
            removeUnhandeledRejection: function (b) {
              b._unhandledRejection = !1;
              for (var a = 0; a < this.unhandledRejections.length; a++) this.unhandledRejections[ a ].promise === b && (this.unhandledRejections.splice(a), a--)
            },
            scheduleRejectionCheck: function () {
              this.pendingRejectionCheck || (this.pendingRejectionCheck = !0, setTimeout(function () {
                this.pendingRejectionCheck = !1;
                for (var b = Date.now(), a = 0; a < this.unhandledRejections.length; a++) if (500 <
                  b - this.unhandledRejections[ a ].time) {
                  var f = this.unhandledRejections[ a ].promise._value, k = 'Unhandled rejection: ' + f;
                  f.stack && (k += '\n' + f.stack);
                  e(k);
                  this.unhandledRejections.splice(a);
                  a--
                }
                this.unhandledRejections.length && this.scheduleRejectionCheck()
              }.bind(this), 500))
            }
          };
          b.all = function (a) {
            function f(b) {
              2 !== r._status && (p = [], g(b))
            }

            var k, g, r = new b(function (b, a) {
              k = b;
              g = a
            }), h = a.length, p = [];
            if (0 === h) return k(p), r;
            for (var d = 0, Z = a.length; d < Z; ++d) {
              var n = a[ d ], x = function (b) {
                return function (a) {
                  2 !== r._status && (p[ b ] =
                    a, h--, 0 === h && k(p))
                }
              }(d);
              b.isPromise(n) ? n.then(x, f) : x(n)
            }
            return r
          };
          b.isPromise = function (b) {
            return b && 'function' === typeof b.then
          };
          b.resolve = function (a) {
            return new b(function (b) {
              b(a)
            })
          };
          b.reject = function (a) {
            return new b(function (b, f) {
              f(a)
            })
          };
          b.prototype = {
            _status: null, _value: null, _handlers: null, _unhandledRejection: null, _updateStatus: function (f, k) {
              1 !== this._status && 2 !== this._status && (1 === f && b.isPromise(k) ? k.then(this._updateStatus.bind(this, 1), this._updateStatus.bind(this, 2)) : (this._status = f, this._value =
                k, 2 === f && 0 === this._handlers.length && (this._unhandledRejection = !0, a.addUnhandledRejection(this)), a.scheduleHandlers(this)))
            }, _resolve: function (b) {
              this._updateStatus(1, b)
            }, _reject: function (b) {
              this._updateStatus(2, b)
            }, then: function (f, k) {
              var g = new b(function (b, a) {
                this.resolve = b;
                this.reject = a
              });
              this._handlers.push({thisPromise: this, onResolve: f, onReject: k, nextPromise: g});
              a.scheduleHandlers(this);
              return g
            }, catch: function (b) {
              return this.then(void 0, b)
            }
          };
          E.Promise = b
        }
      })();
      var f = function () {
        function b() {
          this.started =
            Object.create(null);
          this.times = [];
          this.enabled = !0
        }

        b.prototype = {
          time: function (b) {
            this.enabled && (b in this.started && e('Timer is already running for ' + b), this.started[ b ] = Date.now())
          }, timeEnd: function (b) {
            this.enabled && (b in this.started || e('Timer has not been started for ' + b), this.times.push({
              name: b,
              start: this.started[ b ],
              end: Date.now()
            }), delete this.started[ b ])
          }, toString: function () {
            var b, a, f = this.times, k = '', g = 0;
            b = 0;
            for (a = f.length; b < a; ++b) {
              var r = f[ b ].name;
              r.length > g && (g = r.length)
            }
            b = 0;
            for (a = f.length; b <
            a; ++b) {
              for (var h = f[ b ], r = h.end - h.start, h = h.name; h.length < g;) h += ' ';
              k += h + ' ' + r + 'ms\n'
            }
            return k
          }
        };
        return b
      }(), h = function (b, a) {
        if ('undefined' !== typeof Blob) return new Blob([ b ], {type: a});
        var f = new MozBlobBuilder;
        f.append(b);
        return f.getBlob(a)
      }, w = function () {
        return function (b, a, f) {
          if (!f && 'undefined' !== typeof URL && URL.createObjectURL) return b = h(b, a), URL.createObjectURL(b);
          a = 'data:' + a + ';base64,';
          f = 0;
          for (var k = b.length; f < k; f += 3) {
            var g = b[ f ] & 255, r = b[ f + 1 ] & 255, p = b[ f + 2 ] & 255;
            a += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[ g >>
            2 ] + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[ (g & 3) << 4 | r >> 4 ] + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[ f + 1 < k ? (r & 15) << 2 | p >> 6 : 64 ] + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[ f + 2 < k ? p & 63 : 64 ]
          }
          return a
        }
      }();
      I.prototype = {
        on: function (b, a, f) {
          var k = this.actionHandler;
          k[ b ] && u('There is already an actionName called "' + b + '"');
          k[ b ] = [ a, f ]
        }, send: function (b, a, f) {
          this.postMessage({
            sourceName: this.sourceName, targetName: this.targetName, action: b,
            data: a
          }, f)
        }, sendWithPromise: function (b, a, f) {
          var k = this.callbackIndex++;
          b = {sourceName: this.sourceName, targetName: this.targetName, action: b, data: a, callbackId: k};
          a = N();
          this.callbacksCapabilities[ k ] = a;
          try {
            this.postMessage(b, f)
          } catch (g) {
            a.reject(g)
          }
          return a.promise
        }, postMessage: function (b, a) {
          a && this.postMessageTransfers ? this.comObj.postMessage(b, a) : this.comObj.postMessage(b)
        }, destroy: function () {
          this.comObj.removeEventListener('message', this._onComObjOnMessage)
        }
      };
      (function (b) {
        function a(b) {
          '' == b && (r.call(this),
            this._isInvalid = !0);
          return b.toLowerCase()
        }

        function f(b) {
          var a = b.charCodeAt(0);
          return 32 < a && 127 > a && -1 == [ 34, 35, 60, 62, 63, 96 ].indexOf(a) ? b : encodeURIComponent(b)
        }

        function k(b) {
          var a = b.charCodeAt(0);
          return 32 < a && 127 > a && -1 == [ 34, 35, 60, 62, 96 ].indexOf(a) ? b : encodeURIComponent(b)
        }

        function g(b, P, h) {
          function p(b) {
            m.push(b)
          }

          var d = P || 'scheme start', n = 0, G = '', Q = !1, ca = !1, m = [];
          a:for (; (void 0 != b[ n - 1 ] || 0 == n) && !this._isInvalid;) {
            var q = b[ n ];
            switch (d) {
              case 'scheme start':
                if (q && A.test(q)) G += q.toLowerCase(), d = 'scheme'; else if (P) {
                  p('Invalid scheme.');
                  break a
                } else {
                  G = '';
                  d = 'no scheme';
                  continue
                }
                break;
              case 'scheme':
                if (q && e.test(q)) G += q.toLowerCase(); else if (':' == q) {
                  this._scheme = G;
                  G = '';
                  if (P) break a;
                  void 0 !== x[ this._scheme ] && (this._isRelative = !0);
                  d = 'file' == this._scheme ? 'relative' : this._isRelative && h && h._scheme == this._scheme ? 'relative or authority' : this._isRelative ? 'authority first slash' : 'scheme data'
                } else if (P) {
                  void 0 != q && p('Code point not allowed in scheme: ' + q);
                  break a
                } else {
                  G = '';
                  n = 0;
                  d = 'no scheme';
                  continue
                }
                break;
              case 'scheme data':
                '?' == q ? (this._query =
                  '?', d = 'query') : '#' == q ? (this._fragment = '#', d = 'fragment') : void 0 != q && '\t' != q && '\n' != q && '\r' != q && (this._schemeData += f(q));
                break;
              case 'no scheme':
                if (h && void 0 !== x[ h._scheme ]) {
                  d = 'relative';
                  continue
                } else p('Missing scheme.'), r.call(this), this._isInvalid = !0;
                break;
              case 'relative or authority':
                if ('/' == q && '/' == b[ n + 1 ]) d = 'authority ignore slashes'; else {
                  p('Expected /, got: ' + q);
                  d = 'relative';
                  continue
                }
                break;
              case 'relative':
                this._isRelative = !0;
                'file' != this._scheme && (this._scheme = h._scheme);
                if (void 0 == q) {
                  this._host =
                    h._host;
                  this._port = h._port;
                  this._path = h._path.slice();
                  this._query = h._query;
                  this._username = h._username;
                  this._password = h._password;
                  break a
                } else if ('/' == q || '\\' == q) '\\' == q && p('\\ is an invalid code point.'), d = 'relative slash'; else if ('?' == q) this._host = h._host, this._port = h._port, this._path = h._path.slice(), this._query = '?', this._username = h._username, this._password = h._password, d = 'query'; else if ('#' == q) this._host = h._host, this._port = h._port, this._path = h._path.slice(), this._query = h._query, this._fragment = '#',
                  this._username = h._username, this._password = h._password, d = 'fragment'; else {
                  var d = b[ n + 1 ], w = b[ n + 2 ];
                  if ('file' != this._scheme || !A.test(q) || ':' != d && '|' != d || void 0 != w && '/' != w && '\\' != w && '?' != w && '#' != w) this._host = h._host, this._port = h._port, this._username = h._username, this._password = h._password, this._path = h._path.slice(), this._path.pop();
                  d = 'relative path';
                  continue
                }
                break;
              case 'relative slash':
                if ('/' == q || '\\' == q) '\\' == q && p('\\ is an invalid code point.'), d = 'file' == this._scheme ? 'file host' : 'authority ignore slashes';
                else {
                  'file' != this._scheme && (this._host = h._host, this._port = h._port, this._username = h._username, this._password = h._password);
                  d = 'relative path';
                  continue
                }
                break;
              case 'authority first slash':
                if ('/' == q) d = 'authority second slash'; else {
                  p('Expected \'/\', got: ' + q);
                  d = 'authority ignore slashes';
                  continue
                }
                break;
              case 'authority second slash':
                d = 'authority ignore slashes';
                if ('/' != q) {
                  p('Expected \'/\', got: ' + q);
                  continue
                }
                break;
              case 'authority ignore slashes':
                if ('/' != q && '\\' != q) {
                  d = 'authority';
                  continue
                } else p('Expected authority, got: ' +
                  q);
                break;
              case 'authority':
                if ('@' == q) {
                  Q && (p('@ already seen.'), G += '%40');
                  Q = !0;
                  for (q = 0; q < G.length; q++) w = G[ q ], '\t' == w || '\n' == w || '\r' == w ? p('Invalid whitespace in authority.') : ':' == w && null === this._password ? this._password = '' : (w = f(w), null !== this._password ? this._password += w : this._username += w);
                  G = ''
                } else if (void 0 == q || '/' == q || '\\' == q || '?' == q || '#' == q) {
                  n -= G.length;
                  G = '';
                  d = 'host';
                  continue
                } else G += q;
                break;
              case 'file host':
                if (void 0 == q || '/' == q || '\\' == q || '?' == q || '#' == q) {
                  2 != G.length || !A.test(G[ 0 ]) || ':' != G[ 1 ] && '|' !=
                  G[ 1 ] ? (0 != G.length && (this._host = a.call(this, G), G = ''), d = 'relative path start') : d = 'relative path';
                  continue
                } else '\t' == q || '\n' == q || '\r' == q ? p('Invalid whitespace in file host.') : G += q;
                break;
              case 'host':
              case 'hostname':
                if (':' != q || ca) if (void 0 == q || '/' == q || '\\' == q || '?' == q || '#' == q) {
                  this._host = a.call(this, G);
                  G = '';
                  d = 'relative path start';
                  if (P) break a;
                  continue
                } else '\t' != q && '\n' != q && '\r' != q ? ('[' == q ? ca = !0 : ']' == q && (ca = !1), G += q) : p('Invalid code point in host/hostname: ' + q); else if (this._host = a.call(this, G), G = '', d =
                  'port', 'hostname' == P) break a;
                break;
              case 'port':
                if (/[0-9]/.test(q)) G += q; else if (void 0 == q || '/' == q || '\\' == q || '?' == q || '#' == q || P) {
                  '' != G && (G = parseInt(G, 10), G != x[ this._scheme ] && (this._port = G + ''), G = '');
                  if (P) break a;
                  d = 'relative path start';
                  continue
                } else '\t' == q || '\n' == q || '\r' == q ? p('Invalid code point in port: ' + q) : (r.call(this), this._isInvalid = !0);
                break;
              case 'relative path start':
                '\\' == q && p('\'\\\' not allowed in path.');
                d = 'relative path';
                if ('/' != q && '\\' != q) continue;
                break;
              case 'relative path':
                if (void 0 != q &&
                  '/' != q && '\\' != q && (P || '?' != q && '#' != q)) '\t' != q && '\n' != q && '\r' != q && (G += f(q)); else {
                  '\\' == q && p('\\ not allowed in relative path.');
                  if (w = c[ G.toLowerCase() ]) G = w;
                  '..' == G ? (this._path.pop(), '/' != q && '\\' != q && this._path.push('')) : '.' == G && '/' != q && '\\' != q ? this._path.push('') : '.' != G && ('file' == this._scheme && 0 == this._path.length && 2 == G.length && A.test(G[ 0 ]) && '|' == G[ 1 ] && (G = G[ 0 ] + ':'), this._path.push(G));
                  G = '';
                  '?' == q ? (this._query = '?', d = 'query') : '#' == q && (this._fragment = '#', d = 'fragment')
                }
                break;
              case 'query':
                P || '#' != q ? void 0 !=
                  q && '\t' != q && '\n' != q && '\r' != q && (this._query += k(q)) : (this._fragment = '#', d = 'fragment');
                break;
              case 'fragment':
                void 0 != q && '\t' != q && '\n' != q && '\r' != q && (this._fragment += q)
            }
            n++
          }
        }

        function r() {
          this._username = this._schemeData = this._scheme = '';
          this._password = null;
          this._port = this._host = '';
          this._path = [];
          this._fragment = this._query = '';
          this._isRelative = this._isInvalid = !1
        }

        function h(b, a) {
          void 0 === a || a instanceof h || (a = new h(String(a)));
          this._url = b;
          r.call(this);
          var f = b.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
          g.call(this,
            f, null, a)
        }

        var p = !1;
        try {
          if ('function' === typeof URL && 'object' === typeof URL.prototype && 'origin' in URL.prototype) {
            var d = new URL('b', 'http://a');
            d.pathname = 'c%20d';
            p = 'http://a/c%20d' === d.href
          }
        } catch (n) {
        }
        if (!p) {
          var x = Object.create(null);
          x.ftp = 21;
          x.file = 0;
          x.gopher = 70;
          x.http = 80;
          x.https = 443;
          x.ws = 80;
          x.wss = 443;
          var c = Object.create(null);
          c[ '%2e' ] = '.';
          c[ '.%2e' ] = '..';
          c[ '%2e.' ] = '..';
          c[ '%2e%2e' ] = '..';
          var A = /[a-zA-Z]/, e = /[a-zA-Z0-9\+\-\.]/;
          h.prototype = {
            toString: function () {
              return this.href
            }, get href() {
              if (this._isInvalid) return this._url;
              var b = '';
              if ('' != this._username || null != this._password) b = this._username + (null != this._password ? ':' + this._password : '') + '@';
              return this.protocol + (this._isRelative ? '//' + b + this.host : '') + this.pathname + this._query + this._fragment
            }, set href(b) {
              r.call(this);
              g.call(this, b)
            }, get protocol() {
              return this._scheme + ':'
            }, set protocol(b) {
              this._isInvalid || g.call(this, b + ':', 'scheme start')
            }, get host() {
              return this._isInvalid ? '' : this._port ? this._host + ':' + this._port : this._host
            }, set host(b) {
              !this._isInvalid && this._isRelative &&
              g.call(this, b, 'host')
            }, get hostname() {
              return this._host
            }, set hostname(b) {
              !this._isInvalid && this._isRelative && g.call(this, b, 'hostname')
            }, get port() {
              return this._port
            }, set port(b) {
              !this._isInvalid && this._isRelative && g.call(this, b, 'port')
            }, get pathname() {
              return this._isInvalid ? '' : this._isRelative ? '/' + this._path.join('/') : this._schemeData
            }, set pathname(b) {
              !this._isInvalid && this._isRelative && (this._path = [], g.call(this, b, 'relative path start'))
            }, get search() {
              return this._isInvalid || !this._query || '?' == this._query ?
                '' : this._query
            }, set search(b) {
              !this._isInvalid && this._isRelative && (this._query = '?', '?' == b[ 0 ] && (b = b.slice(1)), g.call(this, b, 'query'))
            }, get hash() {
              return this._isInvalid || !this._fragment || '#' == this._fragment ? '' : this._fragment
            }, set hash(b) {
              this._isInvalid || (this._fragment = '#', '#' == b[ 0 ] && (b = b.slice(1)), g.call(this, b, 'fragment'))
            }, get origin() {
              var b;
              if (this._isInvalid || !this._scheme) return '';
              switch (this._scheme) {
                case 'data':
                case 'file':
                case 'javascript':
                case 'mailto':
                  return 'null'
              }
              return (b = this.host) ? this._scheme +
                '://' + b : ''
            }
          };
          var m = b.URL;
          m && (h.createObjectURL = function (b) {
            return m.createObjectURL.apply(m, arguments)
          }, h.revokeObjectURL = function (b) {
            m.revokeObjectURL(b)
          });
          b.URL = h
        }
      })(E);
      c.FONT_IDENTITY_MATRIX = [ .001, 0, 0, .001, 0, 0 ];
      c.IDENTITY_MATRIX = [ 1, 0, 0, 1, 0, 0 ];
      c.OPS = {
        dependency: 1,
        setLineWidth: 2,
        setLineCap: 3,
        setLineJoin: 4,
        setMiterLimit: 5,
        setDash: 6,
        setRenderingIntent: 7,
        setFlatness: 8,
        setGState: 9,
        save: 10,
        restore: 11,
        transform: 12,
        moveTo: 13,
        lineTo: 14,
        curveTo: 15,
        curveTo2: 16,
        curveTo3: 17,
        closePath: 18,
        rectangle: 19,
        stroke: 20,
        closeStroke: 21,
        fill: 22,
        eoFill: 23,
        fillStroke: 24,
        eoFillStroke: 25,
        closeFillStroke: 26,
        closeEOFillStroke: 27,
        endPath: 28,
        clip: 29,
        eoClip: 30,
        beginText: 31,
        endText: 32,
        setCharSpacing: 33,
        setWordSpacing: 34,
        setHScale: 35,
        setLeading: 36,
        setFont: 37,
        setTextRenderingMode: 38,
        setTextRise: 39,
        moveText: 40,
        setLeadingMoveText: 41,
        setTextMatrix: 42,
        nextLine: 43,
        showText: 44,
        showSpacedText: 45,
        nextLineShowText: 46,
        nextLineSetSpacingShowText: 47,
        setCharWidth: 48,
        setCharWidthAndBounds: 49,
        setStrokeColorSpace: 50,
        setFillColorSpace: 51,
        setStrokeColor: 52,
        setStrokeColorN: 53,
        setFillColor: 54,
        setFillColorN: 55,
        setStrokeGray: 56,
        setFillGray: 57,
        setStrokeRGBColor: 58,
        setFillRGBColor: 59,
        setStrokeCMYKColor: 60,
        setFillCMYKColor: 61,
        shadingFill: 62,
        beginInlineImage: 63,
        beginImageData: 64,
        endInlineImage: 65,
        paintXObject: 66,
        markPoint: 67,
        markPointProps: 68,
        beginMarkedContent: 69,
        beginMarkedContentProps: 70,
        endMarkedContent: 71,
        beginCompat: 72,
        endCompat: 73,
        paintFormXObjectBegin: 74,
        paintFormXObjectEnd: 75,
        beginGroup: 76,
        endGroup: 77,
        beginAnnotations: 78,
        endAnnotations: 79,
        beginAnnotation: 80,
        endAnnotation: 81,
        paintJpegXObject: 82,
        paintImageMaskXObject: 83,
        paintImageMaskXObjectGroup: 84,
        paintImageXObject: 85,
        paintInlineImageXObject: 86,
        paintInlineImageXObjectGroup: 87,
        paintImageXObjectRepeat: 88,
        paintImageMaskXObjectRepeat: 89,
        paintSolidColorImageMask: 90,
        constructPath: 91
      };
      c.VERBOSITY_LEVELS = d;
      c.UNSUPPORTED_FEATURES = {
        unknown: 'unknown',
        forms: 'forms',
        javaScript: 'javaScript',
        smask: 'smask',
        shadingPattern: 'shadingPattern',
        font: 'font'
      };
      c.AnnotationBorderStyleType = {SOLID: 1, DASHED: 2, BEVELED: 3, INSET: 4, UNDERLINE: 5};
      c.AnnotationFlag = {
        INVISIBLE: 1,
        HIDDEN: 2,
        PRINT: 4,
        NOZOOM: 8,
        NOROTATE: 16,
        NOVIEW: 32,
        READONLY: 64,
        LOCKED: 128,
        TOGGLENOVIEW: 256,
        LOCKEDCONTENTS: 512
      };
      c.AnnotationType = {
        TEXT: 1,
        LINK: 2,
        FREETEXT: 3,
        LINE: 4,
        SQUARE: 5,
        CIRCLE: 6,
        POLYGON: 7,
        POLYLINE: 8,
        HIGHLIGHT: 9,
        UNDERLINE: 10,
        SQUIGGLY: 11,
        STRIKEOUT: 12,
        STAMP: 13,
        CARET: 14,
        INK: 15,
        POPUP: 16,
        FILEATTACHMENT: 17,
        SOUND: 18,
        MOVIE: 19,
        WIDGET: 20,
        SCREEN: 21,
        PRINTERMARK: 22,
        TRAPNET: 23,
        WATERMARK: 24,
        THREED: 25,
        REDACT: 26
      };
      c.FontType = {
        UNKNOWN: 0, TYPE1: 1, TYPE1C: 2, CIDFONTTYPE0: 3, CIDFONTTYPE0C: 4, TRUETYPE: 5,
        CIDFONTTYPE2: 6, TYPE3: 7, OPENTYPE: 8, TYPE0: 9, MMTYPE1: 10
      };
      c.ImageKind = {GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3};
      c.InvalidPDFException = p;
      c.MessageHandler = I;
      c.MissingDataException = t;
      c.MissingPDFException = v;
      c.NotImplementedException = m;
      c.PageViewport = k;
      c.PasswordException = a;
      c.PasswordResponses = {NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2};
      c.StatTimer = f;
      c.StreamType = {UNKNOWN: 0, FLATE: 1, LZW: 2, DCT: 3, JPX: 4, JBIG: 5, A85: 6, AHX: 7, CCF: 8, RL: 9};
      c.TextRenderingMode = {
        FILL: 0, STROKE: 1, FILL_STROKE: 2, INVISIBLE: 3, FILL_ADD_TO_PATH: 4,
        STROKE_ADD_TO_PATH: 5, FILL_STROKE_ADD_TO_PATH: 6, ADD_TO_PATH: 7, FILL_STROKE_MASK: 3, ADD_TO_PATH_FLAG: 4
      };
      c.UnexpectedResponseException = D;
      c.UnknownErrorException = x;
      c.Util = r;
      c.XRefParseException = n;
      c.arrayByteLength = C;
      c.arraysToBytes = function (b) {
        if (1 === b.length && b[ 0 ] instanceof Uint8Array) return b[ 0 ];
        var a = 0, f, k = b.length, g, h;
        for (f = 0; f < k; f++) g = b[ f ], h = C(g), a += h;
        var r = 0, a = new Uint8Array(a);
        for (f = 0; f < k; f++) g = b[ f ], g instanceof Uint8Array || (g = 'string' === typeof g ? l(g) : new Uint8Array(g)), h = g.byteLength, a.set(g, r),
          r += h;
        return a
      };
      c.assert = F;
      c.bytesToString = function (b) {
        F(null !== b && 'object' === typeof b && void 0 !== b.length, 'Invalid argument for bytesToString');
        var a = b.length;
        if (8192 > a) return String.fromCharCode.apply(null, b);
        for (var f = [], k = 0; k < a; k += 8192) {
          var g = Math.min(k + 8192, a), g = b.subarray(k, g);
          f.push(String.fromCharCode.apply(null, g))
        }
        return f.join('')
      };
      c.createBlob = h;
      c.createPromiseCapability = N;
      c.createObjectURL = w;
      c.deprecated = function (b) {
        console.log('Deprecated API usage: ' + b)
      };
      c.error = u;
      c.getLookupTableFactory =
        function (b) {
          var a;
          return function () {
            b && (a = Object.create(null), b(a), b = null);
            return a
          }
        };
      c.getVerbosityLevel = function () {
        return A
      };
      c.globalScope = E;
      c.info = function (b) {
        A >= d.infos && console.log('Info: ' + b)
      };
      c.isArray = function (b) {
        return b instanceof Array
      };
      c.isArrayBuffer = function (b) {
        return 'object' === typeof b && null !== b && void 0 !== b.byteLength
      };
      c.isBool = function (b) {
        return 'boolean' === typeof b
      };
      c.isEmptyObj = function (b) {
        for (var a in b) return !1;
        return !0
      };
      c.isInt = V;
      c.isNum = function (b) {
        return 'number' === typeof b
      };
      c.isString = function (b) {
        return 'string' === typeof b
      };
      c.isSameOrigin = function (b, a) {
        try {
          var f = new URL(b);
          if (!f.origin || 'null' === f.origin) return !1
        } catch (k) {
          return !1
        }
        var g = new URL(a, f);
        return f.origin === g.origin
      };
      c.isValidUrl = function (b, a) {
        if (!b || 'string' !== typeof b) return !1;
        var f = /^[a-z][a-z0-9+\-.]*(?=:)/i.exec(b);
        if (!f) return a;
        f = f[ 0 ].toLowerCase();
        switch (f) {
          case 'http':
          case 'https':
          case 'ftp':
          case 'mailto':
          case 'tel':
            return !0;
          default:
            return !1
        }
      };
      c.isLittleEndian = function () {
        var b = new Uint8Array(2);
        b[ 0 ] =
          1;
        return 1 === (new Uint16Array(b.buffer))[ 0 ]
      };
      c.isEvalSupported = function () {
        try {
          return new Function(''), !0
        } catch (b) {
          return !1
        }
      };
      c.loadJpegStream = function (b, a, f) {
        var k = new Image;
        k.onload = function () {
          f.resolve(b, k)
        };
        k.onerror = function () {
          f.resolve(b, null);
          e('Error during JPEG image loading')
        };
        k.src = a
      };
      c.log2 = function (b) {
        for (var a = 1, f = 0; b > a;) a <<= 1, f++;
        return f
      };
      c.readInt8 = function (b, a) {
        return b[ a ] << 24 >> 24
      };
      c.readUint16 = function (b, a) {
        return b[ a ] << 8 | b[ a + 1 ]
      };
      c.readUint32 = function (b, a) {
        return (b[ a ] << 24 | b[ a + 1 ] <<
          16 | b[ a + 2 ] << 8 | b[ a + 3 ]) >>> 0
      };
      c.removeNullCharacters = function (b) {
        return 'string' !== typeof b ? (e('The argument for removeNullCharacters must be a string.'), b) : b.replace(z, '')
      };
      c.setVerbosityLevel = function (b) {
        A = b
      };
      c.shadow = function (b, a, f) {
        Object.defineProperty(b, a, {value: f, enumerable: !0, configurable: !0, writable: !1});
        return f
      };
      c.string32 = function (b) {
        return String.fromCharCode(b >> 24 & 255, b >> 16 & 255, b >> 8 & 255, b & 255)
      };
      c.stringToBytes = l;
      c.stringToPDFString = function (b) {
        var a, f = b.length, k = [];
        if ('\u00fe' === b[ 0 ] && '\u00ff' ===
          b[ 1 ]) for (a = 2; a < f; a += 2) k.push(String.fromCharCode(b.charCodeAt(a) << 8 | b.charCodeAt(a + 1))); else for (a = 0; a < f; ++a) {
          var h = g[ b.charCodeAt(a) ];
          k.push(h ? String.fromCharCode(h) : b.charAt(a))
        }
        return k.join('')
      };
      c.stringToUTF8String = function (b) {
        return decodeURIComponent(escape(b))
      };
      c.utf8StringToString = function (b) {
        return unescape(encodeURIComponent(b))
      };
      c.warn = e
    });
    (function (c, e) {
      e(c.pdfjsDisplayDOMUtils = {}, c.pdfjsSharedUtil)
    })(this, function (c, e) {
      function u(c) {
        var l = e.globalScope.PDFJS;
        switch (c) {
          case 'pdfBug':
            return l ?
              l.pdfBug : !1;
          case 'disableAutoFetch':
            return l ? l.disableAutoFetch : !1;
          case 'disableStream':
            return l ? l.disableStream : !1;
          case 'disableRange':
            return l ? l.disableRange : !1;
          case 'disableFontFace':
            return l ? l.disableFontFace : !1;
          case 'disableCreateObjectURL':
            return l ? l.disableCreateObjectURL : !1;
          case 'disableWebGL':
            return l ? l.disableWebGL : !0;
          case 'cMapUrl':
            return l ? l.cMapUrl : null;
          case 'cMapPacked':
            return l ? l.cMapPacked : !1;
          case 'postMessageTransfers':
            return l ? l.postMessageTransfers : !0;
          case 'workerSrc':
            return l ?
              l.workerSrc : null;
          case 'disableWorker':
            return l ? l.disableWorker : !1;
          case 'maxImageSize':
            return l ? l.maxImageSize : -1;
          case 'imageResourcesPath':
            return l ? l.imageResourcesPath : '';
          case 'isEvalSupported':
            return l ? l.isEvalSupported : !0;
          case 'externalLinkTarget':
            if (!l) return C.NONE;
            switch (l.externalLinkTarget) {
              case C.NONE:
              case C.SELF:
              case C.BLANK:
              case C.PARENT:
              case C.TOP:
                return l.externalLinkTarget
            }
            F('PDFJS.externalLinkTarget is invalid: ' + l.externalLinkTarget);
            return l.externalLinkTarget = C.NONE;
          case 'externalLinkRel':
            return l ?
              l.externalLinkRel : 'noreferrer';
          case 'enableStats':
            return !(!l || !l.enableStats);
          default:
            throw Error('Unknown default setting: ' + c);
        }
      }

      var y = e.removeNullCharacters, F = e.warn, l = function () {
        function c() {
        }

        var l = [ 'ms', 'Moz', 'Webkit', 'O' ], e = Object.create(null);
        c.getProp = function (d, c) {
          if (1 === arguments.length && 'string' === typeof e[ d ]) return e[ d ];
          c = c || document.documentElement;
          var a = c.style, x, p;
          if ('string' === typeof a[ d ]) return e[ d ] = d;
          p = d.charAt(0).toUpperCase() + d.slice(1);
          for (var v = 0, D = l.length; v < D; v++) if (x = l[ v ] +
            p, 'string' === typeof a[ x ]) return e[ d ] = x;
          return e[ d ] = 'undefined'
        };
        c.setProp = function (d, c, a) {
          d = this.getProp(d);
          'undefined' !== d && (c.style[ d ] = a)
        };
        return c
      }(), C = {NONE: 0, SELF: 1, BLANK: 2, PARENT: 3, TOP: 4}, V = [ '', '_self', '_blank', '_parent', '_top' ];
      c.CustomStyle = l;
      c.addLinkAttributes = function (c, l) {
        var e = l && l.url;
        c.href = c.title = e ? y(e) : '';
        e && (e = l.target, 'undefined' === typeof e && (e = u('externalLinkTarget')), c.target = V[ e ], e = l.rel, 'undefined' === typeof e && (e = u('externalLinkRel')), c.rel = e)
      };
      c.isExternalLinkTargetSet = function () {
        switch (u('externalLinkTarget')) {
          case C.NONE:
            return !1;
          case C.SELF:
          case C.BLANK:
          case C.PARENT:
          case C.TOP:
            return !0
        }
      };
      c.getFilenameFromUrl = function (c) {
        var e = c.indexOf('#'), l = c.indexOf('?'), e = Math.min(0 < e ? e : c.length, 0 < l ? l : c.length);
        return c.substring(c.lastIndexOf('/', e) + 1, e)
      };
      c.LinkTarget = C;
      c.hasCanvasTypedArrays = function () {
        var c = document.createElement('canvas');
        c.width = c.height = 1;
        return 'undefined' !== typeof c.getContext('2d').createImageData(1, 1).data.buffer
      };
      c.getDefaultSetting = u
    });
    (function (c, e) {
      e(c.pdfjsDisplayFontLoader = {}, c.pdfjsSharedUtil)
    })(this,
      function (c, e) {
        function u(c) {
          this.docId = c;
          this.styleElement = null;
          this.nativeFontFaces = [];
          this.loadTestFontId = 0;
          this.loadingContext = {requests: [], nextRequestId: 0}
        }

        var y = e.assert, F = e.bytesToString, l = e.string32, C = e.shadow, V = e.warn;
        u.prototype = {
          insertRule: function (c) {
            var d = this.styleElement;
            d || (d = this.styleElement = document.createElement('style'), d.id = 'PDFJS_FONT_STYLE_TAG_' + this.docId, document.documentElement.getElementsByTagName('head')[ 0 ].appendChild(d));
            d = d.sheet;
            d.insertRule(c, d.cssRules.length)
          }, clear: function () {
            var c =
              this.styleElement;
            c && (c.parentNode.removeChild(c), c = this.styleElement = null);
            this.nativeFontFaces.forEach(function (d) {
              document.fonts.delete(d)
            });
            this.nativeFontFaces.length = 0
          }, get loadTestFont() {
            return C(this, 'loadTestFont', atob('T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQAABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwAAAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbmFtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAAAADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6AABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAAMQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAAAAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAAAAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQAAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMAAQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAAEAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgcA/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQAAAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAgABAAAAAAAAAAAD6AAAAAAAAA=='))
          },
          addNativeFontFace: function (c) {
            this.nativeFontFaces.push(c);
            document.fonts.add(c)
          }, bind: function (c, d) {
            for (var e = [], a = [], x = [], p = function (a) {
              return a.loaded.catch(function (k) {
                V('Failed to load font "' + a.family + '": ' + k)
              })
            }, l = 0, D = c.length; l < D; l++) {
              var m = c[ l ];
              if (!m.attached && !1 !== m.loading) if (m.attached = !0, u.isFontLoadingAPISupported) {
                if (m = m.createNativeFontFace()) this.addNativeFontFace(m), x.push(p(m))
              } else {
                var t = m.createFontFaceRule();
                t && (this.insertRule(t), e.push(t), a.push(m))
              }
            }
            var n = this.queueLoadingCallback(d);
            u.isFontLoadingAPISupported ? Promise.all(x).then(function () {
              n.complete()
            }) : 0 < e.length && !u.isSyncFontLoadingSupported ? this.prepareFontLoadEvent(e, a, n) : n.complete()
          }, queueLoadingCallback: function (c) {
            var d = this.loadingContext, e = {
              id: 'pdfjs-font-loading-' + d.nextRequestId++, complete: function () {
                y(!e.end, 'completeRequest() cannot be called twice');
                for (e.end = Date.now(); 0 < d.requests.length && d.requests[ 0 ].end;) {
                  var a = d.requests.shift();
                  setTimeout(a.callback, 0)
                }
              }, callback: c, started: Date.now()
            };
            d.requests.push(e);
            return e
          }, prepareFontLoadEvent: function (c, d, e) {
            function a(a, k) {
              return a.charCodeAt(k) << 24 | a.charCodeAt(k + 1) << 16 | a.charCodeAt(k + 2) << 8 | a.charCodeAt(k + 3) & 255
            }

            function x(a, k, f, h) {
              var d = a.substr(0, k);
              a = a.substr(k + f);
              return d + h + a
            }

            function p(a, k) {
              t++;
              30 < t ? (V('Load test font never loaded.'), k()) : (m.font = '30px ' + a, m.fillText('.', 0, 20), 0 < m.getImageData(0, 0, 1, 1).data[ 3 ] ? k() : setTimeout(p.bind(null, a, k)))
            }

            var v, D;
            c = document.createElement('canvas');
            c.width = 1;
            c.height = 1;
            var m = c.getContext('2d'), t = 0;
            c = 'lt' + Date.now() +
              this.loadTestFontId++;
            var n = this.loadTestFont, n = x(n, 976, c.length, c), z = a(n, 16);
            v = 0;
            for (D = c.length - 3; v < D; v += 4) z = z - 1482184792 + a(c, v) | 0;
            v < c.length && (z = z - 1482184792 + a(c + 'XXX', v) | 0);
            n = x(n, 16, 4, l(z));
            v = 'url(data:font/opentype;base64,' + btoa(n) + ');';
            this.insertRule('@font-face { font-family:"' + c + '";src:' + v + '}');
            n = [];
            v = 0;
            for (D = d.length; v < D; v++) n.push(d[ v ].loadedName);
            n.push(c);
            var k = document.createElement('div');
            k.setAttribute('style', 'visibility: hidden;width: 10px; height: 10px;position: absolute; top: 0px; left: 0px;');
            v = 0;
            for (D = n.length; v < D; ++v) d = document.createElement('span'), d.textContent = 'Hi', d.style.fontFamily = n[ v ], k.appendChild(d);
            document.body.appendChild(k);
            p(c, function () {
              document.body.removeChild(k);
              e.complete()
            })
          }
        };
        u.isFontLoadingAPISupported = 'undefined' !== typeof document && !!document.fonts;
        Object.defineProperty(u, 'isSyncFontLoadingSupported', {
          get: function () {
            if ('undefined' === typeof navigator) return C(u, 'isSyncFontLoadingSupported', !0);
            var c = !1, d = /Mozilla\/5.0.*?rv:(\d+).*? Gecko/.exec(navigator.userAgent);
            d && 14 <= d[ 1 ] && (c = !0);
            return C(u, 'isSyncFontLoadingSupported', c)
          }, enumerable: !0, configurable: !0
        });
        var N = {
          get value() {
            return C(this, 'value', e.isEvalSupported())
          }
        }, I = function () {
          function c(d, e) {
            this.compiledGlyphs = Object.create(null);
            for (var a in d) this[ a ] = d[ a ];
            this.options = e
          }

          c.prototype = {
            createNativeFontFace: function () {
              if (!this.data) return null;
              if (this.options.disableFontFace) return this.disableFontFace = !0, null;
              var d = new FontFace(this.loadedName, this.data, {});
              this.options.fontRegistry && this.options.fontRegistry.registerFont(this);
              return d
            }, createFontFaceRule: function () {
              if (!this.data) return null;
              if (this.options.disableFontFace) return this.disableFontFace = !0, null;
              var d = F(new Uint8Array(this.data)), c = this.loadedName,
                d = 'url(data:' + this.mimetype + ';base64,' + btoa(d) + ');',
                c = '@font-face { font-family:"' + c + '";src:' + d + '}';
              this.options.fontRegistry && this.options.fontRegistry.registerFont(this, d);
              return c
            }, getPathGenerator: function (d, c) {
              if (!(c in this.compiledGlyphs)) {
                var a = d.get(this.loadedName + '_path_' + c), e, p, l;
                if (this.options.isEvalSupported &&
                  N.value) {
                  var D, m = '';
                  p = 0;
                  for (l = a.length; p < l; p++) e = a[ p ], D = void 0 !== e.args ? e.args.join(',') : '', m += 'c.' + e.cmd + '(' + D + ');\n';
                  this.compiledGlyphs[ c ] = new Function('c', 'size', m)
                } else this.compiledGlyphs[ c ] = function (d, c) {
                  p = 0;
                  for (l = a.length; p < l; p++) e = a[ p ], 'scale' === e.cmd && (e.args = [ c, -c ]), d[ e.cmd ].apply(d, e.args)
                }
              }
              return this.compiledGlyphs[ c ]
            }
          };
          return c
        }();
        c.FontFaceObject = I;
        c.FontLoader = u
      });
    (function (c, e) {
      e(c.pdfjsDisplayMetadata = {}, c.pdfjsSharedUtil)
    })(this, function (c, e) {
      function u(c) {
        return c.replace(/>\\376\\377([^<]+)/g,
          function (c, e) {
            for (var l = e.replace(/\\([0-3])([0-7])([0-7])/g, function (c, a, d, p) {
              return String.fromCharCode(64 * a + 8 * d + 1 * p)
            }), u = '', E = 0; E < l.length; E += 2) var d = 256 * l.charCodeAt(E) + l.charCodeAt(E + 1), u = u + ('&#x' + (65536 + d).toString(16).substring(1) + ';');
            return '>' + u
          })
      }

      function y(c) {
        'string' === typeof c ? (c = u(c), c = (new DOMParser).parseFromString(c, 'application/xml')) : c instanceof Document || F('Metadata: Invalid metadata object');
        this.metaDocument = c;
        this.metadata = Object.create(null);
        this.parse()
      }

      var F = e.error;
      y.prototype =
        {
          parse: function () {
            var c = this.metaDocument.documentElement;
            if ('rdf:rdf' !== c.nodeName.toLowerCase()) for (c = c.firstChild; c && "rdf:rdf" !== c.nodeName.toLowerCase();) c = c.nextSibling;
            var e = c ? c.nodeName.toLowerCase() : null;
            if (c && 'rdf:rdf' === e && c.hasChildNodes()) {
              var c = c.childNodes, u, y, I, E, d, A;
              I = 0;
              for (d = c.length; I < d; I++) if (e = c[ I ], 'rdf:description' === e.nodeName.toLowerCase()) for (E = 0, A = e.childNodes.length; E < A; E++) '#text' !== e.childNodes[ E ].nodeName.toLowerCase() && (u = e.childNodes[ E ], y = u.nodeName.toLowerCase(), this.metadata[ y ] =
                u.textContent.trim())
            }
          }, get: function (c) {
            return this.metadata[ c ] || null
          }, has: function (c) {
            return 'undefined' !== typeof this.metadata[ c ]
          }
        };
      c.Metadata = y
    });
    (function (c, e) {
      e(c.pdfjsDisplaySVG = {}, c.pdfjsSharedUtil)
    })(this, function (c, e) {
      var u = e.FONT_IDENTITY_MATRIX, y = e.IDENTITY_MATRIX, F = e.ImageKind, l = e.OPS, C = e.Util, B = e.isNum,
        N = e.isArray, I = e.warn, E = e.createObjectURL, d = function () {
          function a(c, p, k, r) {
            var g = r, f = p.length;
            k[ g ] = f >> 24 & 255;
            k[ g + 1 ] = f >> 16 & 255;
            k[ g + 2 ] = f >> 8 & 255;
            k[ g + 3 ] = f & 255;
            g += 4;
            k[ g ] = c.charCodeAt(0) & 255;
            k[ g +
            1 ] = c.charCodeAt(1) & 255;
            k[ g + 2 ] = c.charCodeAt(2) & 255;
            k[ g + 3 ] = c.charCodeAt(3) & 255;
            g += 4;
            k.set(p, g);
            g += p.length;
            c = -1;
            for (r += 4; r < g; r++) c = c >>> 8 ^ d[ (c ^ k[ r ]) & 255 ];
            r = c ^ -1;
            k[ g ] = r >> 24 & 255;
            k[ g + 1 ] = r >> 16 & 255;
            k[ g + 2 ] = r >> 8 & 255;
            k[ g + 3 ] = r & 255
          }

          for (var c = new Uint8Array([ 137, 80, 78, 71, 13, 10, 26, 10 ]), d = new Int32Array(256), e = 0; 256 > e; e++) {
            for (var m = e, l = 0; 8 > l; l++) m = m & 1 ? 3988292384 ^ m >> 1 & 2147483647 : m >> 1 & 2147483647;
            d[ e ] = m
          }
          return function (d, e) {
            var k = void 0 === d.kind ? F.GRAYSCALE_1BPP : d.kind, r = d.width, g = d.height, f, h, w, b = d.data;
            switch (k) {
              case F.GRAYSCALE_1BPP:
                h =
                  0;
                f = 1;
                w = r + 7 >> 3;
                break;
              case F.RGB_24BPP:
                h = 2;
                f = 8;
                w = 3 * r;
                break;
              case F.RGBA_32BPP:
                h = 6;
                f = 8;
                w = 4 * r;
                break;
              default:
                throw Error('invalid format');
            }
            var m = new Uint8Array((1 + w) * g), l = 0, A = 0, t;
            for (t = 0; t < g; ++t) m[ l++ ] = 0, m.set(b.subarray(A, A + w), l), A += w, l += w;
            if (k === F.GRAYSCALE_1BPP) for (t = l = 0; t < g; t++) for (l++, k = 0; k < w; k++) m[ l++ ] ^= 255;
            r = new Uint8Array([ r >> 24 & 255, r >> 16 & 255, r >> 8 & 255, r & 255, g >> 24 & 255, g >> 16 & 255, g >> 8 & 255, g & 255, f, h, 0, 0, 0 ]);
            h = m.length;
            g = Math.ceil(h / 65535);
            g = new Uint8Array(2 + h + 5 * g + 4);
            f = 0;
            g[ f++ ] = 120;
            g[ f++ ] = 156;
            for (w =
                   0; 65535 < h;) g[ f++ ] = 0, g[ f++ ] = 255, g[ f++ ] = 255, g[ f++ ] = 0, g[ f++ ] = 0, g.set(m.subarray(w, w + 65535), f), f += 65535, w += 65535, h -= 65535;
            g[ f++ ] = 1;
            g[ f++ ] = h & 255;
            g[ f++ ] = h >> 8 & 255;
            g[ f++ ] = ~h & 255;
            g[ f++ ] = (~h & 65535) >> 8 & 255;
            g.set(m.subarray(w), f);
            f += m.length - w;
            h = 1;
            for (l = w = 0; l < m.length; ++l) h = (h + (m[ l ] & 255)) % 65521, w = (w + h) % 65521;
            m = w << 16 | h;
            g[ f++ ] = m >> 24 & 255;
            g[ f++ ] = m >> 16 & 255;
            g[ f++ ] = m >> 8 & 255;
            g[ f++ ] = m & 255;
            m = new Uint8Array(c.length + 36 + r.length + g.length);
            f = 0;
            m.set(c, f);
            f += c.length;
            a('IHDR', r, m, f);
            f += 12 + r.length;
            a('IDATA', g, m, f);
            f += 12 + g.length;
            a('IEND', new Uint8Array(0), m, f);
            return E(m, 'image/png', e)
          }
        }(), A = function () {
          function a() {
            this.fontSizeScale = 1;
            this.fontWeight = 'normal';
            this.fontSize = 0;
            this.textMatrix = y;
            this.fontMatrix = u;
            this.wordSpacing = this.charSpacing = this.lineY = this.lineX = this.y = this.x = this.leading = 0;
            this.textHScale = 1;
            this.textRise = 0;
            this.strokeColor = this.fillColor = '#000000';
            this.lineWidth = this.strokeAlpha = this.fillAlpha = 1;
            this.lineCap = this.lineJoin = '';
            this.miterLimit = 0;
            this.dashArray = [];
            this.dashPhase = 0;
            this.dependencies = [];
            this.clipId =
              '';
            this.pendingClip = !1;
            this.maskId = ''
          }

          a.prototype = {
            clone: function () {
              return Object.create(this)
            }, setCurrentPoint: function (a, c) {
              this.x = a;
              this.y = c
            }
          };
          return a
        }(), a = function () {
          function a(k, c) {
            var g = document.createElementNS('http://www.w3.org/2000/svg', 'svg:svg');
            g.setAttributeNS(null, 'version', '1.1');
            g.setAttributeNS(null, 'width', k + 'px');
            g.setAttributeNS(null, 'height', c + 'px');
            g.setAttributeNS(null, 'viewBox', '0 0 ' + k + ' ' + c);
            return g
          }

          function c(a) {
            if (a === (a | 0)) return a.toString();
            a = a.toFixed(10);
            var r = a.length -
              1;
            if ('0' !== a[ r ]) return a;
            do r--; while ('0' === a[ r ]);
            return a.substr(0, '.' === a[ r ] ? r : r + 1)
          }

          function e(a) {
            if (0 === a[ 4 ] && 0 === a[ 5 ]) {
              if (0 === a[ 1 ] && 0 === a[ 2 ]) return 1 === a[ 0 ] && 1 === a[ 3 ] ? '' : 'scale(' + c(a[ 0 ]) + ' ' + c(a[ 3 ]) + ')';
              if (a[ 0 ] === a[ 3 ] && a[ 1 ] === -a[ 2 ]) return a = 180 * Math.acos(a[ 0 ]) / Math.PI, 'rotate(' + c(a) + ')'
            } else if (1 === a[ 0 ] && 0 === a[ 1 ] && 0 === a[ 2 ] && 1 === a[ 3 ]) return 'translate(' + c(a[ 4 ]) + ' ' + c(a[ 5 ]) + ')';
            return 'matrix(' + c(a[ 0 ]) + ' ' + c(a[ 1 ]) + ' ' + c(a[ 2 ]) + ' ' + c(a[ 3 ]) + ' ' + c(a[ 4 ]) + ' ' + c(a[ 5 ]) + ')'
          }

          function D(a, c, g) {
            this.current =
              new A;
            this.transformMatrix = y;
            this.transformStack = [];
            this.extraStack = [];
            this.commonObjs = a;
            this.objs = c;
            this.embedFonts = this.pendingEOFill = !1;
            this.embeddedFonts = Object.create(null);
            this.cssStyle = null;
            this.forceDataSchema = !!g
          }

          var m = [ 'butt', 'round', 'square' ], t = [ 'miter', 'round', 'bevel' ], n = 0, z = 0;
          D.prototype = {
            save: function () {
              this.transformStack.push(this.transformMatrix);
              var a = this.current;
              this.extraStack.push(a);
              this.current = a.clone()
            }, restore: function () {
              this.transformMatrix = this.transformStack.pop();
              this.current =
                this.extraStack.pop();
              this.tgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
              this.tgrp.setAttributeNS(null, 'transform', e(this.transformMatrix));
              this.pgrp.appendChild(this.tgrp)
            }, group: function (a) {
              this.save();
              this.executeOpTree(a);
              this.restore()
            }, loadDependencies: function (a) {
              var c = a.fnArray, g = c.length;
              a = a.argsArray;
              for (var f = this, h = 0; h < g; h++) if (l.dependency === c[ h ]) for (var d = a[ h ], b = 0, e = d.length; b < e; b++) {
                var m = d[ b ], n;
                n = 'g_' === m.substring(0, 2) ? new Promise(function (a) {
                  f.commonObjs.get(m,
                    a)
                }) : new Promise(function (a) {
                  f.objs.get(m, a)
                });
                this.current.dependencies.push(n)
              }
              return Promise.all(this.current.dependencies)
            }, transform: function (a, c, g, f, h, d) {
              this.transformMatrix = C.transform(this.transformMatrix, [ a, c, g, f, h, d ]);
              this.tgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
              this.tgrp.setAttributeNS(null, 'transform', e(this.transformMatrix))
            }, getSVG: function (c, r) {
              this.svg = a(r.width, r.height);
              this.viewport = r;
              return this.loadDependencies(c).then(function () {
                this.transformMatrix =
                  y;
                this.pgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
                this.pgrp.setAttributeNS(null, 'transform', e(r.transform));
                this.tgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
                this.tgrp.setAttributeNS(null, 'transform', e(this.transformMatrix));
                this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg:defs');
                this.pgrp.appendChild(this.defs);
                this.pgrp.appendChild(this.tgrp);
                this.svg.appendChild(this.pgrp);
                var a = this.convertOpList(c);
                this.executeOpTree(a);
                return this.svg
              }.bind(this))
            },
            convertOpList: function (a) {
              var c = a.argsArray, g = a.fnArray, f = g.length, h = [];
              a = [];
              for (var d in l) h[ l[ d ] ] = d;
              for (d = 0; d < f; d++) {
                var b = g[ d ];
                a.push({fnId: b, fn: h[ b ], args: c[ d ]})
              }
              c = [];
              g = [];
              f = a.length;
              for (h = 0; h < f; h++) 'save' === a[ h ].fn ? (c.push({
                fnId: 92,
                fn: 'group',
                items: []
              }), g.push(c), c = c[ c.length - 1 ].items) : 'restore' === a[ h ].fn ? c = g.pop() : c.push(a[ h ]);
              return c
            }, executeOpTree: function (a) {
              for (var c = a.length, g = 0; g < c; g++) {
                var f = a[ g ].fn, h = a[ g ].args;
                switch (a[ g ].fnId | 0) {
                  case l.beginText:
                    this.beginText();
                    break;
                  case l.setLeading:
                    this.setLeading(h);
                    break;
                  case l.setLeadingMoveText:
                    this.setLeadingMoveText(h[ 0 ], h[ 1 ]);
                    break;
                  case l.setFont:
                    this.setFont(h);
                    break;
                  case l.showText:
                    this.showText(h[ 0 ]);
                    break;
                  case l.showSpacedText:
                    this.showText(h[ 0 ]);
                    break;
                  case l.endText:
                    this.endText();
                    break;
                  case l.moveText:
                    this.moveText(h[ 0 ], h[ 1 ]);
                    break;
                  case l.setCharSpacing:
                    this.setCharSpacing(h[ 0 ]);
                    break;
                  case l.setWordSpacing:
                    this.setWordSpacing(h[ 0 ]);
                    break;
                  case l.setHScale:
                    this.setHScale(h[ 0 ]);
                    break;
                  case l.setTextMatrix:
                    this.setTextMatrix(h[ 0 ], h[ 1 ], h[ 2 ], h[ 3 ], h[ 4 ], h[ 5 ]);
                    break;
                  case l.setLineWidth:
                    this.setLineWidth(h[ 0 ]);
                    break;
                  case l.setLineJoin:
                    this.setLineJoin(h[ 0 ]);
                    break;
                  case l.setLineCap:
                    this.setLineCap(h[ 0 ]);
                    break;
                  case l.setMiterLimit:
                    this.setMiterLimit(h[ 0 ]);
                    break;
                  case l.setFillRGBColor:
                    this.setFillRGBColor(h[ 0 ], h[ 1 ], h[ 2 ]);
                    break;
                  case l.setStrokeRGBColor:
                    this.setStrokeRGBColor(h[ 0 ], h[ 1 ], h[ 2 ]);
                    break;
                  case l.setDash:
                    this.setDash(h[ 0 ], h[ 1 ]);
                    break;
                  case l.setGState:
                    this.setGState(h[ 0 ]);
                    break;
                  case l.fill:
                    this.fill();
                    break;
                  case l.eoFill:
                    this.eoFill();
                    break;
                  case l.stroke:
                    this.stroke();
                    break;
                  case l.fillStroke:
                    this.fillStroke();
                    break;
                  case l.eoFillStroke:
                    this.eoFillStroke();
                    break;
                  case l.clip:
                    this.clip('nonzero');
                    break;
                  case l.eoClip:
                    this.clip('evenodd');
                    break;
                  case l.paintSolidColorImageMask:
                    this.paintSolidColorImageMask();
                    break;
                  case l.paintJpegXObject:
                    this.paintJpegXObject(h[ 0 ], h[ 1 ], h[ 2 ]);
                    break;
                  case l.paintImageXObject:
                    this.paintImageXObject(h[ 0 ]);
                    break;
                  case l.paintInlineImageXObject:
                    this.paintInlineImageXObject(h[ 0 ]);
                    break;
                  case l.paintImageMaskXObject:
                    this.paintImageMaskXObject(h[ 0 ]);
                    break;
                  case l.paintFormXObjectBegin:
                    this.paintFormXObjectBegin(h[ 0 ], h[ 1 ]);
                    break;
                  case l.paintFormXObjectEnd:
                    this.paintFormXObjectEnd();
                    break;
                  case l.closePath:
                    this.closePath();
                    break;
                  case l.closeStroke:
                    this.closeStroke();
                    break;
                  case l.closeFillStroke:
                    this.closeFillStroke();
                    break;
                  case l.nextLine:
                    this.nextLine();
                    break;
                  case l.transform:
                    this.transform(h[ 0 ], h[ 1 ], h[ 2 ], h[ 3 ], h[ 4 ], h[ 5 ]);
                    break;
                  case l.constructPath:
                    this.constructPath(h[ 0 ], h[ 1 ]);
                    break;
                  case l.endPath:
                    this.endPath();
                    break;
                  case 92:
                    this.group(a[ g ].items);
                    break;
                  default:
                    I('Unimplemented method ' + f)
                }
              }
            }, setWordSpacing: function (a) {
              this.current.wordSpacing = a
            }, setCharSpacing: function (a) {
              this.current.charSpacing = a
            }, nextLine: function () {
              this.moveText(0, this.current.leading)
            }, setTextMatrix: function (a, d, g, f, h, e) {
              var b = this.current;
              this.current.textMatrix = this.current.lineMatrix = [ a, d, g, f, h, e ];
              this.current.x = this.current.lineX = 0;
              this.current.y = this.current.lineY = 0;
              b.xcoords = [];
              b.tspan = document.createElementNS('http://www.w3.org/2000/svg', 'svg:tspan');
              b.tspan.setAttributeNS(null,
                'font-family', b.fontFamily);
              b.tspan.setAttributeNS(null, 'font-size', c(b.fontSize) + 'px');
              b.tspan.setAttributeNS(null, 'y', c(-b.y));
              b.txtElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg:text');
              b.txtElement.appendChild(b.tspan)
            }, beginText: function () {
              this.current.x = this.current.lineX = 0;
              this.current.y = this.current.lineY = 0;
              this.current.textMatrix = y;
              this.current.lineMatrix = y;
              this.current.tspan = document.createElementNS('http://www.w3.org/2000/svg', 'svg:tspan');
              this.current.txtElement = document.createElementNS('http://www.w3.org/2000/svg',
                'svg:text');
              this.current.txtgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
              this.current.xcoords = []
            }, moveText: function (a, d) {
              var g = this.current;
              this.current.x = this.current.lineX += a;
              this.current.y = this.current.lineY += d;
              g.xcoords = [];
              g.tspan = document.createElementNS('http://www.w3.org/2000/svg', 'svg:tspan');
              g.tspan.setAttributeNS(null, 'font-family', g.fontFamily);
              g.tspan.setAttributeNS(null, 'font-size', c(g.fontSize) + 'px');
              g.tspan.setAttributeNS(null, 'y', c(-g.y))
            }, showText: function (a) {
              var d =
                this.current, g = d.font, f = d.fontSize;
              if (0 !== f) {
                var h = d.charSpacing, m = d.wordSpacing, b = d.fontDirection, n = d.textHScale * b, l = a.length,
                  g = g.vertical, x = f * d.fontMatrix[ 0 ], A = 0, t;
                for (t = 0; t < l; ++t) {
                  var J = a[ t ];
                  if (null === J) A += b * m; else if (B(J)) A += -J * f * .001; else {
                    d.xcoords.push(d.x + A * n);
                    var D = J.fontChar, A = A + (J.width * x + h * b);
                    d.tspan.textContent += D
                  }
                }
                g ? d.y -= A * n : d.x += A * n;
                d.tspan.setAttributeNS(null, 'x', d.xcoords.map(c).join(' '));
                d.tspan.setAttributeNS(null, 'y', c(-d.y));
                d.tspan.setAttributeNS(null, 'font-family', d.fontFamily);
                d.tspan.setAttributeNS(null, 'font-size', c(d.fontSize) + 'px');
                'normal' !== d.fontStyle && d.tspan.setAttributeNS(null, 'font-style', d.fontStyle);
                'normal' !== d.fontWeight && d.tspan.setAttributeNS(null, 'font-weight', d.fontWeight);
                '#000000' !== d.fillColor && d.tspan.setAttributeNS(null, 'fill', d.fillColor);
                d.txtElement.setAttributeNS(null, 'transform', e(d.textMatrix) + ' scale(1, -1)');
                d.txtElement.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
                d.txtElement.appendChild(d.tspan);
                d.txtgrp.appendChild(d.txtElement);
                this.tgrp.appendChild(d.txtElement)
              }
            }, setLeadingMoveText: function (a, c) {
              this.setLeading(-c);
              this.moveText(a, c)
            }, addFontStyle: function (a) {
              this.cssStyle || (this.cssStyle = document.createElementNS('http://www.w3.org/2000/svg', 'svg:style'), this.cssStyle.setAttributeNS(null, 'type', 'text/css'), this.defs.appendChild(this.cssStyle));
              var c = E(a.data, a.mimetype, this.forceDataSchema);
              this.cssStyle.textContent += '@font-face { font-family: "' + a.loadedName + '"; src: url(' + c + '); }\n'
            }, setFont: function (a) {
              var d = this.current,
                g = this.commonObjs.get(a[ 0 ]);
              a = a[ 1 ];
              this.current.font = g;
              this.embedFonts && g.data && !this.embeddedFonts[ g.loadedName ] && (this.addFontStyle(g), this.embeddedFonts[ g.loadedName ] = g);
              d.fontMatrix = g.fontMatrix ? g.fontMatrix : u;
              var f = g.black ? g.bold ? 'bolder' : 'bold' : g.bold ? 'bold' : 'normal',
                h = g.italic ? 'italic' : 'normal';
              0 > a ? (a = -a, d.fontDirection = -1) : d.fontDirection = 1;
              d.fontSize = a;
              d.fontFamily = g.loadedName;
              d.fontWeight = f;
              d.fontStyle = h;
              d.tspan = document.createElementNS('http://www.w3.org/2000/svg', 'svg:tspan');
              d.tspan.setAttributeNS(null,
                'y', c(-d.y));
              d.xcoords = []
            }, endText: function () {
              this.current.pendingClip ? (this.cgrp.appendChild(this.tgrp), this.pgrp.appendChild(this.cgrp)) : this.pgrp.appendChild(this.tgrp);
              this.tgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
              this.tgrp.setAttributeNS(null, 'transform', e(this.transformMatrix))
            }, setLineWidth: function (a) {
              this.current.lineWidth = a
            }, setLineCap: function (a) {
              this.current.lineCap = m[ a ]
            }, setLineJoin: function (a) {
              this.current.lineJoin = t[ a ]
            }, setMiterLimit: function (a) {
              this.current.miterLimit =
                a
            }, setStrokeRGBColor: function (a, c, g) {
              a = C.makeCssRgb(a, c, g);
              this.current.strokeColor = a
            }, setFillRGBColor: function (a, c, g) {
              a = C.makeCssRgb(a, c, g);
              this.current.fillColor = a;
              this.current.tspan = document.createElementNS('http://www.w3.org/2000/svg', 'svg:tspan');
              this.current.xcoords = []
            }, setDash: function (a, c) {
              this.current.dashArray = a;
              this.current.dashPhase = c
            }, constructPath: function (a, d) {
              var g = this.current, f = g.x, h = g.y;
              g.path = document.createElementNS('http://www.w3.org/2000/svg', 'svg:path');
              for (var e = [], b = a.length,
                     m = 0, n = 0; m < b; m++) switch (a[ m ] | 0) {
                case l.rectangle:
                  var f = d[ n++ ], h = d[ n++ ], x = d[ n++ ], A = d[ n++ ], x = f + x, A = h + A;
                  e.push('M', c(f), c(h), 'L', c(x), c(h), 'L', c(x), c(A), 'L', c(f), c(A), 'Z');
                  break;
                case l.moveTo:
                  f = d[ n++ ];
                  h = d[ n++ ];
                  e.push('M', c(f), c(h));
                  break;
                case l.lineTo:
                  f = d[ n++ ];
                  h = d[ n++ ];
                  e.push('L', c(f), c(h));
                  break;
                case l.curveTo:
                  f = d[ n + 4 ];
                  h = d[ n + 5 ];
                  e.push('C', c(d[ n ]), c(d[ n + 1 ]), c(d[ n + 2 ]), c(d[ n + 3 ]), c(f), c(h));
                  n += 6;
                  break;
                case l.curveTo2:
                  f = d[ n + 2 ];
                  h = d[ n + 3 ];
                  e.push('C', c(f), c(h), c(d[ n ]), c(d[ n + 1 ]), c(d[ n + 2 ]), c(d[ n + 3 ]));
                  n += 4;
                  break;
                case l.curveTo3:
                  f = d[ n + 2 ];
                  h = d[ n + 3 ];
                  e.push('C', c(d[ n ]), c(d[ n + 1 ]), c(f), c(h), c(f), c(h));
                  n += 4;
                  break;
                case l.closePath:
                  e.push('Z')
              }
              g.path.setAttributeNS(null, 'd', e.join(' '));
              g.path.setAttributeNS(null, 'stroke-miterlimit', c(g.miterLimit));
              g.path.setAttributeNS(null, 'stroke-linecap', g.lineCap);
              g.path.setAttributeNS(null, 'stroke-linejoin', g.lineJoin);
              g.path.setAttributeNS(null, 'stroke-width', c(g.lineWidth) + 'px');
              g.path.setAttributeNS(null, 'stroke-dasharray', g.dashArray.map(c).join(' '));
              g.path.setAttributeNS(null,
                'stroke-dashoffset', c(g.dashPhase) + 'px');
              g.path.setAttributeNS(null, 'fill', 'none');
              this.tgrp.appendChild(g.path);
              g.pendingClip ? (this.cgrp.appendChild(this.tgrp), this.pgrp.appendChild(this.cgrp)) : this.pgrp.appendChild(this.tgrp);
              g.element = g.path;
              g.setCurrentPoint(f, h)
            }, endPath: function () {
              this.current.pendingClip ? (this.cgrp.appendChild(this.tgrp), this.pgrp.appendChild(this.cgrp)) : this.pgrp.appendChild(this.tgrp);
              this.tgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
              this.tgrp.setAttributeNS(null,
                'transform', e(this.transformMatrix))
            }, clip: function (a) {
              var c = this.current;
              c.clipId = 'clippath' + n;
              n++;
              this.clippath = document.createElementNS('http://www.w3.org/2000/svg', 'svg:clipPath');
              this.clippath.setAttributeNS(null, 'id', c.clipId);
              var d = c.element.cloneNode();
              'evenodd' === a ? d.setAttributeNS(null, 'clip-rule', 'evenodd') : d.setAttributeNS(null, 'clip-rule', 'nonzero');
              this.clippath.setAttributeNS(null, 'transform', e(this.transformMatrix));
              this.clippath.appendChild(d);
              this.defs.appendChild(this.clippath);
              c.pendingClip = !0;
              this.cgrp = document.createElementNS('http://www.w3.org/2000/svg', 'svg:g');
              this.cgrp.setAttributeNS(null, 'clip-path', 'url(#' + c.clipId + ')');
              this.pgrp.appendChild(this.cgrp)
            }, closePath: function () {
              var a = this.current, c = a.path.getAttributeNS(null, 'd');
              a.path.setAttributeNS(null, 'd', c + 'Z')
            }, setLeading: function (a) {
              this.current.leading = -a
            }, setTextRise: function (a) {
              this.current.textRise = a
            }, setHScale: function (a) {
              this.current.textHScale = a / 100
            }, setGState: function (a) {
              for (var c = 0, d = a.length; c < d; c++) {
                var f =
                  a[ c ], h = f[ 1 ];
                switch (f[ 0 ]) {
                  case 'LW':
                    this.setLineWidth(h);
                    break;
                  case 'LC':
                    this.setLineCap(h);
                    break;
                  case 'LJ':
                    this.setLineJoin(h);
                    break;
                  case 'ML':
                    this.setMiterLimit(h);
                    break;
                  case 'D':
                    this.setDash(h[ 0 ], h[ 1 ]);
                    break;
                  case 'Font':
                    this.setFont(h)
                }
              }
            }, fill: function () {
              var a = this.current;
              a.element.setAttributeNS(null, 'fill', a.fillColor)
            }, stroke: function () {
              var a = this.current;
              a.element.setAttributeNS(null, 'stroke', a.strokeColor);
              a.element.setAttributeNS(null, 'fill', 'none')
            }, eoFill: function () {
              var a = this.current;
              a.element.setAttributeNS(null, 'fill', a.fillColor);
              a.element.setAttributeNS(null, 'fill-rule', 'evenodd')
            }, fillStroke: function () {
              this.stroke();
              this.fill()
            }, eoFillStroke: function () {
              this.current.element.setAttributeNS(null, 'fill-rule', 'evenodd');
              this.fillStroke()
            }, closeStroke: function () {
              this.closePath();
              this.stroke()
            }, closeFillStroke: function () {
              this.closePath();
              this.fillStroke()
            }, paintSolidColorImageMask: function () {
              var a = this.current, c = document.createElementNS('http://www.w3.org/2000/svg', 'svg:rect');
              c.setAttributeNS(null, 'x', '0');
              c.setAttributeNS(null, 'y', '0');
              c.setAttributeNS(null, 'width', '1px');
              c.setAttributeNS(null, 'height', '1px');
              c.setAttributeNS(null, 'fill', a.fillColor);
              this.tgrp.appendChild(c)
            }, paintJpegXObject: function (a, d, g) {
              var f = this.current;
              a = this.objs.get(a);
              var h = document.createElementNS('http://www.w3.org/2000/svg', 'svg:image');
              h.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', a.src);
              h.setAttributeNS(null, 'width', a.width + 'px');
              h.setAttributeNS(null, 'height', a.height +
                'px');
              h.setAttributeNS(null, 'x', '0');
              h.setAttributeNS(null, 'y', c(-g));
              h.setAttributeNS(null, 'transform', 'scale(' + c(1 / d) + ' ' + c(-1 / g) + ')');
              this.tgrp.appendChild(h);
              f.pendingClip ? (this.cgrp.appendChild(this.tgrp), this.pgrp.appendChild(this.cgrp)) : this.pgrp.appendChild(this.tgrp)
            }, paintImageXObject: function (a) {
              (a = this.objs.get(a)) ? this.paintInlineImageXObject(a) : I('Dependent image isn\'t ready yet')
            }, paintInlineImageXObject: function (a, e) {
              var g = this.current, f = a.width, h = a.height, n = d(a, this.forceDataSchema),
                b = document.createElementNS('http://www.w3.org/2000/svg', 'svg:rect');
              b.setAttributeNS(null, 'x', '0');
              b.setAttributeNS(null, 'y', '0');
              b.setAttributeNS(null, 'width', c(f));
              b.setAttributeNS(null, 'height', c(h));
              g.element = b;
              this.clip('nonzero');
              b = document.createElementNS('http://www.w3.org/2000/svg', 'svg:image');
              b.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', n);
              b.setAttributeNS(null, 'x', '0');
              b.setAttributeNS(null, 'y', c(-h));
              b.setAttributeNS(null, 'width', c(f) + 'px');
              b.setAttributeNS(null, 'height',
                c(h) + 'px');
              b.setAttributeNS(null, 'transform', 'scale(' + c(1 / f) + ' ' + c(-1 / h) + ')');
              e ? e.appendChild(b) : this.tgrp.appendChild(b);
              g.pendingClip ? (this.cgrp.appendChild(this.tgrp), this.pgrp.appendChild(this.cgrp)) : this.pgrp.appendChild(this.tgrp)
            }, paintImageMaskXObject: function (a) {
              var d = this.current, g = a.width, f = a.height, h = d.fillColor;
              d.maskId = 'mask' + z++;
              var e = document.createElementNS('http://www.w3.org/2000/svg', 'svg:mask');
              e.setAttributeNS(null, 'id', d.maskId);
              var b = document.createElementNS('http://www.w3.org/2000/svg',
                'svg:rect');
              b.setAttributeNS(null, 'x', '0');
              b.setAttributeNS(null, 'y', '0');
              b.setAttributeNS(null, 'width', c(g));
              b.setAttributeNS(null, 'height', c(f));
              b.setAttributeNS(null, 'fill', h);
              b.setAttributeNS(null, 'mask', 'url(#' + d.maskId + ')');
              this.defs.appendChild(e);
              this.tgrp.appendChild(b);
              this.paintInlineImageXObject(a, e)
            }, paintFormXObjectBegin: function (a, d) {
              this.save();
              N(a) && 6 === a.length && this.transform(a[ 0 ], a[ 1 ], a[ 2 ], a[ 3 ], a[ 4 ], a[ 5 ]);
              if (N(d) && 4 === d.length) {
                var g = d[ 2 ] - d[ 0 ], f = d[ 3 ] - d[ 1 ], h = document.createElementNS('http://www.w3.org/2000/svg',
                  'svg:rect');
                h.setAttributeNS(null, 'x', d[ 0 ]);
                h.setAttributeNS(null, 'y', d[ 1 ]);
                h.setAttributeNS(null, 'width', c(g));
                h.setAttributeNS(null, 'height', c(f));
                this.current.element = h;
                this.clip('nonzero');
                this.endPath()
              }
            }, paintFormXObjectEnd: function () {
              this.restore()
            }
          };
          return D
        }();
      c.SVGGraphics = a
    });
    (function (c, e) {
      e(c.pdfjsDisplayAnnotationLayer = {}, c.pdfjsSharedUtil, c.pdfjsDisplayDOMUtils)
    })(this, function (c, e, u) {
      function y() {
      }

      var F = e.AnnotationBorderStyleType, l = e.AnnotationType, C = e.Util, B = u.addLinkAttributes,
        N = u.LinkTarget, I = u.getFilenameFromUrl, E = e.warn, d = u.CustomStyle, A = u.getDefaultSetting;
      y.prototype = {
        create: function (c) {
          switch (c.data.annotationType) {
            case l.LINK:
              return new x(c);
            case l.TEXT:
              return new p(c);
            case l.WIDGET:
              return new v(c);
            case l.POPUP:
              return new D(c);
            case l.HIGHLIGHT:
              return new t(c);
            case l.UNDERLINE:
              return new n(c);
            case l.SQUIGGLY:
              return new z(c);
            case l.STRIKEOUT:
              return new k(c);
            case l.FILEATTACHMENT:
              return new r(c);
            default:
              return new a(c)
          }
        }
      };
      var a = function () {
        function a(f, c) {
          this.isRenderable =
            c || !1;
          this.data = f.data;
          this.layer = f.layer;
          this.page = f.page;
          this.viewport = f.viewport;
          this.linkService = f.linkService;
          this.downloadManager = f.downloadManager;
          this.imageResourcesPath = f.imageResourcesPath;
          c && (this.container = this._createContainer())
        }

        a.prototype = {
          _createContainer: function () {
            var a = this.data, c = this.page, g = this.viewport, b = document.createElement('section'),
              e = a.rect[ 2 ] - a.rect[ 0 ], k = a.rect[ 3 ] - a.rect[ 1 ];
            b.setAttribute('data-annotation-id', a.id);
            c = C.normalizeRect([ a.rect[ 0 ], c.view[ 3 ] - a.rect[ 1 ] + c.view[ 1 ],
              a.rect[ 2 ], c.view[ 3 ] - a.rect[ 3 ] + c.view[ 1 ] ]);
            d.setProp('transform', b, 'matrix(' + g.transform.join(',') + ')');
            d.setProp('transformOrigin', b, -c[ 0 ] + 'px ' + -c[ 1 ] + 'px');
            if (0 < a.borderStyle.width) {
              b.style.borderWidth = a.borderStyle.width + 'px';
              a.borderStyle.style !== F.UNDERLINE && (e -= 2 * a.borderStyle.width, k -= 2 * a.borderStyle.width);
              var g = a.borderStyle.horizontalCornerRadius, n = a.borderStyle.verticalCornerRadius;
              (0 < g || 0 < n) && d.setProp('borderRadius', b, g + 'px / ' + n + 'px');
              switch (a.borderStyle.style) {
                case F.SOLID:
                  b.style.borderStyle =
                    'solid';
                  break;
                case F.DASHED:
                  b.style.borderStyle = 'dashed';
                  break;
                case F.BEVELED:
                  E('Unimplemented border style: beveled');
                  break;
                case F.INSET:
                  E('Unimplemented border style: inset');
                  break;
                case F.UNDERLINE:
                  b.style.borderBottomStyle = 'solid'
              }
              a.color ? b.style.borderColor = C.makeCssRgb(a.color[ 0 ] | 0, a.color[ 1 ] | 0, a.color[ 2 ] | 0) : b.style.borderWidth = 0
            }
            b.style.left = c[ 0 ] + 'px';
            b.style.top = c[ 1 ] + 'px';
            b.style.width = e + 'px';
            b.style.height = k + 'px';
            return b
          }, _createPopup: function (a, c, d) {
            c || (c = document.createElement('div'), c.style.height =
              a.style.height, c.style.width = a.style.width, a.appendChild(c));
            c = (new m({
              container: a,
              trigger: c,
              color: d.color,
              title: d.title,
              contents: d.contents,
              hideWrapper: !0
            })).render();
            c.style.left = a.style.width;
            a.appendChild(c)
          }, render: function () {
            throw Error('Abstract method AnnotationElement.render called');
          }
        };
        return a
      }(), x = function () {
        function c(f) {
          a.call(this, f, !0)
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'linkAnnotation';
            var a = document.createElement('a');
            B(a, {
              url: this.data.url, target: this.data.newWindow ?
                N.BLANK : void 0
            });
            this.data.url || (this.data.action ? this._bindNamedAction(a, this.data.action) : this._bindLink(a, this.data.dest || null));
            this.container.appendChild(a);
            return this.container
          }, _bindLink: function (a, c) {
            var d = this;
            a.href = this.linkService.getDestinationHash(c);
            a.onclick = function () {
              c && d.linkService.navigateTo(c);
              return !1
            };
            c && (a.className = 'internalLink')
          }, _bindNamedAction: function (a, c) {
            var d = this;
            a.href = this.linkService.getAnchorUrl('');
            a.onclick = function () {
              d.linkService.executeNamedAction(c);
              return !1
            };
            a.className = 'internalLink'
          }
        });
        return c
      }(), p = function () {
        function c(f) {
          a.call(this, f, !!(f.data.hasPopup || f.data.title || f.data.contents))
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'textAnnotation';
            var a = document.createElement('img');
            a.style.height = this.container.style.height;
            a.style.width = this.container.style.width;
            a.src = this.imageResourcesPath + 'annotation-' + this.data.name.toLowerCase() + '.svg';
            a.alt = '[{{type}} Annotation]';
            a.dataset.l10nId = 'text_annotation_type';
            a.dataset.l10nArgs =
              JSON.stringify({type: this.data.name});
            this.data.hasPopup || this._createPopup(this.container, a, this.data);
            this.container.appendChild(a);
            return this.container
          }
        });
        return c
      }(), v = function () {
        function c(f) {
          a.call(this, f, !f.data.hasAppearance && !!f.data.fieldValue)
        }

        C.inherit(c, a, {
          render: function () {
            var a = document.createElement('div');
            a.textContent = this.data.fieldValue;
            a.style.textAlign = [ 'left', 'center', 'right' ][ this.data.textAlignment ];
            a.style.verticalAlign = 'middle';
            a.style.display = 'table-cell';
            var c = this.data.fontRefName ?
              this.page.commonObjs.getData(this.data.fontRefName) : null;
            this._setTextStyle(a, c);
            this.container.appendChild(a);
            return this.container
          }, _setTextStyle: function (a, c) {
            var d = a.style;
            d.fontSize = this.data.fontSize + 'px';
            d.direction = 0 > this.data.fontDirection ? 'rtl' : 'ltr';
            c && (d.fontWeight = c.black ? c.bold ? '900' : 'bold' : c.bold ? 'bold' : 'normal', d.fontStyle = c.italic ? 'italic' : 'normal', d.fontFamily = (c.loadedName ? '"' + c.loadedName + '", ' : '') + (c.fallbackName || 'Helvetica, sans-serif'))
          }
        });
        return c
      }(), D = function () {
        function c(f) {
          a.call(this,
            f, !(!f.data.title && !f.data.contents))
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'popupAnnotation';
            var a = this.layer.querySelector('[data-annotation-id="' + this.data.parentId + '"]');
            if (!a) return this.container;
            var c = new m({
              container: this.container,
              trigger: a,
              color: this.data.color,
              title: this.data.title,
              contents: this.data.contents
            }), g = parseFloat(a.style.left), b = parseFloat(a.style.width);
            d.setProp('transformOrigin', this.container, -(g + b) + 'px -' + a.style.top);
            this.container.style.left = g + b + 'px';
            this.container.appendChild(c.render());
            return this.container
          }
        });
        return c
      }(), m = function () {
        function a(c) {
          this.container = c.container;
          this.trigger = c.trigger;
          this.color = c.color;
          this.title = c.title;
          this.contents = c.contents;
          this.hideWrapper = c.hideWrapper || !1;
          this.pinned = !1
        }

        a.prototype = {
          render: function () {
            var a = document.createElement('div');
            a.className = 'popupWrapper';
            this.hideElement = this.hideWrapper ? a : this.container;
            this.hideElement.setAttribute('hidden', !0);
            var c = document.createElement('div');
            c.className =
              'popup';
            var d = this.color;
            d && (c.style.backgroundColor = C.makeCssRgb(.7 * (255 - d[ 0 ]) + d[ 0 ] | 0, .7 * (255 - d[ 1 ]) + d[ 1 ] | 0, .7 * (255 - d[ 2 ]) + d[ 2 ] | 0));
            var d = this._formatContents(this.contents), b = document.createElement('h1');
            b.textContent = this.title;
            this.trigger.addEventListener('click', this._toggle.bind(this));
            this.trigger.addEventListener('mouseover', this._show.bind(this, !1));
            this.trigger.addEventListener('mouseout', this._hide.bind(this, !1));
            c.addEventListener('click', this._hide.bind(this, !0));
            c.appendChild(b);
            c.appendChild(d);
            a.appendChild(c);
            return a
          }, _formatContents: function (a) {
            var c = document.createElement('p');
            a = a.split(/(?:\r\n?|\n)/);
            for (var d = 0, b = a.length; d < b; ++d) c.appendChild(document.createTextNode(a[ d ])), d < b - 1 && c.appendChild(document.createElement('br'));
            return c
          }, _toggle: function () {
            this.pinned ? this._hide(!0) : this._show(!0)
          }, _show: function (a) {
            a && (this.pinned = !0);
            this.hideElement.hasAttribute('hidden') && (this.hideElement.removeAttribute('hidden'), this.container.style.zIndex += 1)
          }, _hide: function (a) {
            a && (this.pinned =
              !1);
            this.hideElement.hasAttribute('hidden') || this.pinned || (this.hideElement.setAttribute('hidden', !0), --this.container.style.zIndex)
          }
        };
        return a
      }(), t = function () {
        function c(d) {
          a.call(this, d, !!(d.data.hasPopup || d.data.title || d.data.contents))
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'highlightAnnotation';
            this.data.hasPopup || this._createPopup(this.container, null, this.data);
            return this.container
          }
        });
        return c
      }(), n = function () {
        function c(d) {
          a.call(this, d, !!(d.data.hasPopup || d.data.title ||
            d.data.contents))
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'underlineAnnotation';
            this.data.hasPopup || this._createPopup(this.container, null, this.data);
            return this.container
          }
        });
        return c
      }(), z = function () {
        function c(d) {
          a.call(this, d, !!(d.data.hasPopup || d.data.title || d.data.contents))
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'squigglyAnnotation';
            this.data.hasPopup || this._createPopup(this.container, null, this.data);
            return this.container
          }
        });
        return c
      }(), k = function () {
        function c(d) {
          a.call(this,
            d, !!(d.data.hasPopup || d.data.title || d.data.contents))
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'strikeoutAnnotation';
            this.data.hasPopup || this._createPopup(this.container, null, this.data);
            return this.container
          }
        });
        return c
      }(), r = function () {
        function c(d) {
          a.call(this, d, !0);
          this.filename = I(d.data.file.filename);
          this.content = d.data.file.content
        }

        C.inherit(c, a, {
          render: function () {
            this.container.className = 'fileAttachmentAnnotation';
            var a = document.createElement('div');
            a.style.height = this.container.style.height;
            a.style.width = this.container.style.width;
            a.addEventListener('dblclick', this._download.bind(this));
            this.data.hasPopup || !this.data.title && !this.data.contents || this._createPopup(this.container, a, this.data);
            this.container.appendChild(a);
            return this.container
          }, _download: function () {
            this.downloadManager ? this.downloadManager.downloadData(this.content, this.filename, '') : E('Download cannot be started due to unavailable download manager')
          }
        });
        return c
      }();
      e = function () {
        return {
          render: function (a) {
            for (var c = new y,
                   d = 0, e = a.annotations.length; d < e; d++) {
              var b = a.annotations[ d ];
              b && (b = {
                data: b,
                layer: a.div,
                page: a.page,
                viewport: a.viewport,
                linkService: a.linkService,
                downloadManager: a.downloadManager,
                imageResourcesPath: a.imageResourcesPath || A('imageResourcesPath')
              }, b = c.create(b), b.isRenderable && a.div.appendChild(b.render()))
            }
          }, update: function (a) {
            for (var c = 0, h = a.annotations.length; c < h; c++) {
              var e = a.div.querySelector('[data-annotation-id="' + a.annotations[ c ].id + '"]');
              e && d.setProp('transform', e, 'matrix(' + a.viewport.transform.join(',') +
                ')')
            }
            a.div.removeAttribute('hidden')
          }
        }
      }();
      c.AnnotationLayer = e
    });
    (function (c, e) {
      e(c.pdfjsDisplayTextLayer = {}, c.pdfjsSharedUtil, c.pdfjsDisplayDOMUtils)
    })(this, function (c, e, u) {
      var y = e.Util, F = e.createPromiseCapability, l = u.CustomStyle, C = u.getDefaultSetting;
      e = function () {
        function c(d, e, a, x) {
          x = x[ a.fontName ];
          var l = document.createElement('div');
          d.push(l);
          if (E.test(a.str)) {
            var v = y.transform(e.transform, a.transform);
            d = Math.atan2(v[ 1 ], v[ 0 ]);
            x.vertical && (d += Math.PI / 2);
            var D = Math.sqrt(v[ 2 ] * v[ 2 ] + v[ 3 ] * v[ 3 ]), m = D;
            x.ascent ?
              m *= x.ascent : x.descent && (m *= 1 + x.descent);
            var t;
            0 === d ? (t = v[ 4 ], v = v[ 5 ] - m) : (t = v[ 4 ] + m * Math.sin(d), v = v[ 5 ] - m * Math.cos(d));
            l.style.left = t + 'px';
            l.style.top = v + 'px';
            l.style.fontSize = D + 'px';
            l.style.fontFamily = x.fontFamily;
            l.textContent = a.str;
            C('pdfBug') && (l.dataset.fontName = a.fontName);
            0 !== d && (l.dataset.angle = 180 / Math.PI * d);
            1 < a.str.length && (l.dataset.canvasWidth = x.vertical ? a.height * e.scale : a.width * e.scale)
          } else l.dataset.isWhitespace = !0
        }

        function e(c) {
          if (!c._canceled) {
            var A = c._container, a = c._textDivs;
            c = c._capability;
            var x = a.length;
            if (!(1E5 < x)) {
              var p = document.createElement('canvas');
              p.mozOpaque = !0;
              for (var p = p.getContext('2d', {alpha: !1}), v, D, m = 0; m < x; m++) {
                var t = a[ m ];
                if (void 0 === t.dataset.isWhitespace) {
                  var n = t.style.fontSize, z = t.style.fontFamily;
                  if (n !== v || z !== D) p.font = n + ' ' + z, v = n, D = z;
                  n = p.measureText(t.textContent).width;
                  0 < n && (A.appendChild(t), n = void 0 !== t.dataset.canvasWidth ? 'scaleX(' + t.dataset.canvasWidth / n + ')' : '', (z = t.dataset.angle) && (n = 'rotate(' + z + 'deg) ' + n), n && l.setProp('transform', t, n))
                }
              }
            }
            c.resolve()
          }
        }

        function u(c,
                   e, a, l) {
          this._textContent = c;
          this._container = e;
          this._viewport = a;
          this._textDivs = l = l || [];
          this._canceled = !1;
          this._capability = F();
          this._renderTimer = null
        }

        var E = /\S/;
        u.prototype = {
          get promise() {
            return this._capability.promise
          }, cancel: function () {
            this._canceled = !0;
            null !== this._renderTimer && (clearTimeout(this._renderTimer), this._renderTimer = null);
            this._capability.reject('canceled')
          }, _render: function (d) {
            for (var l = this._textContent.items, a = this._textContent.styles, x = this._textDivs, p = this._viewport, v = 0, D = l.length; v <
            D; v++) c(x, p, l[ v ], a);
            if (d) {
              var m = this;
              this._renderTimer = setTimeout(function () {
                e(m);
                m._renderTimer = null
              }, d)
            } else e(this)
          }
        };
        return function (c) {
          var e = new u(c.textContent, c.container, c.viewport, c.textDivs);
          e._render(c.timeout);
          return e
        }
      }();
      c.renderTextLayer = e
    });
    (function (c, e) {
      e(c.pdfjsDisplayWebGL = {}, c.pdfjsSharedUtil, c.pdfjsDisplayDOMUtils)
    })(this, function (c, e, u) {
      var y = e.shadow, F = u.getDefaultSetting;
      e = function () {
        function c(a, d, e) {
          e = a.createShader(e);
          a.shaderSource(e, d);
          a.compileShader(e);
          if (!a.getShaderParameter(e,
            a.COMPILE_STATUS)) throw a = a.getShaderInfoLog(e), Error('Error during shader compilation: ' + a);
          return e
        }

        function e(a, c) {
          for (var d = a.createProgram(), l = 0, A = c.length; l < A; ++l) a.attachShader(d, c[ l ]);
          a.linkProgram(d);
          if (!a.getProgramParameter(d, a.LINK_STATUS)) throw d = a.getProgramInfoLog(d), Error('Error during program linking: ' + d);
          return d
        }

        function u(a, c, d) {
          a.activeTexture(d);
          d = a.createTexture();
          a.bindTexture(a.TEXTURE_2D, d);
          a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE);
          a.texParameteri(a.TEXTURE_2D,
            a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE);
          a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.NEAREST);
          a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.NEAREST);
          a.texImage2D(a.TEXTURE_2D, 0, a.RGBA, a.RGBA, a.UNSIGNED_BYTE, c);
          return d
        }

        function B() {
          I || (E = document.createElement('canvas'), I = E.getContext('webgl', {premultipliedalpha: !1}))
        }

        var I, E, d = null, A = null;
        return {
          get isEnabled() {
            if (F('disableWebGL')) return !1;
            var a = !1;
            try {
              B(), a = !!I
            } catch (c) {
            }
            return y(this, 'isEnabled', a)
          }, composeSMask: function (a, x, A) {
            var v = a.width,
              D = a.height;
            if (!d) {
              var m, t;
              B();
              m = E;
              E = null;
              t = I;
              I = null;
              var n = c(t, '  attribute vec2 a_position;                                      attribute vec2 a_texCoord;                                                                                                      uniform vec2 u_resolution;                                                                                                      varying vec2 v_texCoord;                                                                                                        void main() {                                                     vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;       gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);                                                                              v_texCoord = a_texCoord;                                      }                                                             ',
                t.VERTEX_SHADER),
                z = c(t, '  precision mediump float;                                                                                                        uniform vec4 u_backdrop;                                        uniform int u_subtype;                                          uniform sampler2D u_image;                                      uniform sampler2D u_mask;                                                                                                       varying vec2 v_texCoord;                                                                                                        void main() {                                                     vec4 imageColor = texture2D(u_image, v_texCoord);               vec4 maskColor = texture2D(u_mask, v_texCoord);                 if (u_backdrop.a > 0.0) {                                         maskColor.rgb = maskColor.rgb * maskColor.a +                                   u_backdrop.rgb * (1.0 - maskColor.a);         }                                                               float lum;                                                      if (u_subtype == 0) {                                             lum = maskColor.a;                                            } else {                                                          lum = maskColor.r * 0.3 + maskColor.g * 0.59 +                        maskColor.b * 0.11;                                     }                                                               imageColor.a *= lum;                                            imageColor.rgb *= imageColor.a;                                 gl_FragColor = imageColor;                                    }                                                             ',
                  t.FRAGMENT_SHADER), k = e(t, [ n, z ]);
              t.useProgram(k);
              n = {};
              n.gl = t;
              n.canvas = m;
              n.resolutionLocation = t.getUniformLocation(k, 'u_resolution');
              n.positionLocation = t.getAttribLocation(k, 'a_position');
              n.backdropLocation = t.getUniformLocation(k, 'u_backdrop');
              n.subtypeLocation = t.getUniformLocation(k, 'u_subtype');
              m = t.getAttribLocation(k, 'a_texCoord');
              var z = t.getUniformLocation(k, 'u_image'), k = t.getUniformLocation(k, 'u_mask'), r = t.createBuffer();
              t.bindBuffer(t.ARRAY_BUFFER, r);
              t.bufferData(t.ARRAY_BUFFER, new Float32Array([ 0,
                0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1 ]), t.STATIC_DRAW);
              t.enableVertexAttribArray(m);
              t.vertexAttribPointer(m, 2, t.FLOAT, !1, 0, 0);
              t.uniform1i(z, 0);
              t.uniform1i(k, 1);
              d = n
            }
            t = d;
            n = t.canvas;
            m = t.gl;
            n.width = v;
            n.height = D;
            m.viewport(0, 0, m.drawingBufferWidth, m.drawingBufferHeight);
            m.uniform2f(t.resolutionLocation, v, D);
            A.backdrop ? m.uniform4f(t.resolutionLocation, A.backdrop[ 0 ], A.backdrop[ 1 ], A.backdrop[ 2 ], 1) : m.uniform4f(t.resolutionLocation, 0, 0, 0, 0);
            m.uniform1i(t.subtypeLocation, 'Luminosity' === A.subtype ? 1 : 0);
            a = u(m, a, m.TEXTURE0);
            x =
              u(m, x, m.TEXTURE1);
            A = m.createBuffer();
            m.bindBuffer(m.ARRAY_BUFFER, A);
            m.bufferData(m.ARRAY_BUFFER, new Float32Array([ 0, 0, v, 0, 0, D, 0, D, v, 0, v, D ]), m.STATIC_DRAW);
            m.enableVertexAttribArray(t.positionLocation);
            m.vertexAttribPointer(t.positionLocation, 2, m.FLOAT, !1, 0, 0);
            m.clearColor(0, 0, 0, 0);
            m.enable(m.BLEND);
            m.blendFunc(m.ONE, m.ONE_MINUS_SRC_ALPHA);
            m.clear(m.COLOR_BUFFER_BIT);
            m.drawArrays(m.TRIANGLES, 0, 6);
            m.flush();
            m.deleteTexture(a);
            m.deleteTexture(x);
            m.deleteBuffer(A);
            return n
          }, drawFigures: function (a, d, p,
                                    v, D) {
            if (!A) {
              var m, t;
              B();
              m = E;
              E = null;
              t = I;
              I = null;
              var n = c(t, '  attribute vec2 a_position;                                      attribute vec3 a_color;                                                                                                         uniform vec2 u_resolution;                                      uniform vec2 u_scale;                                           uniform vec2 u_offset;                                                                                                          varying vec4 v_color;                                                                                                           void main() {                                                     vec2 position = (a_position + u_offset) * u_scale;              vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;         gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);                                                                              v_color = vec4(a_color / 255.0, 1.0);                         }                                                             ',
                t.VERTEX_SHADER),
                z = c(t, '  precision mediump float;                                                                                                        varying vec4 v_color;                                                                                                           void main() {                                                     gl_FragColor = v_color;                                       }                                                             ', t.FRAGMENT_SHADER),
                n = e(t, [ n,
                  z ]);
              t.useProgram(n);
              z = {};
              z.gl = t;
              z.canvas = m;
              z.resolutionLocation = t.getUniformLocation(n, 'u_resolution');
              z.scaleLocation = t.getUniformLocation(n, 'u_scale');
              z.offsetLocation = t.getUniformLocation(n, 'u_offset');
              z.positionLocation = t.getAttribLocation(n, 'a_position');
              z.colorLocation = t.getAttribLocation(n, 'a_color');
              A = z
            }
            m = A;
            t = m.canvas;
            n = m.gl;
            t.width = a;
            t.height = d;
            n.viewport(0, 0, n.drawingBufferWidth, n.drawingBufferHeight);
            n.uniform2f(m.resolutionLocation, a, d);
            a = 0;
            var k, r, g;
            k = 0;
            for (r = v.length; k < r; k++) switch (v[ k ].type) {
              case 'lattice':
                g =
                  v[ k ].coords.length / v[ k ].verticesPerRow | 0;
                a += (g - 1) * (v[ k ].verticesPerRow - 1) * 6;
                break;
              case 'triangles':
                a += v[ k ].coords.length
            }
            z = new Float32Array(2 * a);
            d = new Uint8Array(3 * a);
            var f = D.coords, h = D.colors, w = 0, b = 0;
            k = 0;
            for (r = v.length; k < r; k++) {
              g = v[ k ];
              var u = g.coords, y = g.colors;
              switch (g.type) {
                case 'lattice':
                  var H = g.verticesPerRow;
                  g = u.length / H | 0;
                  for (var O = 1; O < g; O++) for (var M = O * H + 1, J = 1; J < H; J++, M++) z[ w ] = f[ u[ M - H - 1 ] ], z[ w + 1 ] = f[ u[ M - H - 1 ] + 1 ], z[ w + 2 ] = f[ u[ M - H ] ], z[ w + 3 ] = f[ u[ M - H ] + 1 ], z[ w + 4 ] = f[ u[ M - 1 ] ], z[ w + 5 ] = f[ u[ M - 1 ] + 1 ], d[ b ] = h[ y[ M -
                  H - 1 ] ], d[ b + 1 ] = h[ y[ M - H - 1 ] + 1 ], d[ b + 2 ] = h[ y[ M - H - 1 ] + 2 ], d[ b + 3 ] = h[ y[ M - H ] ], d[ b + 4 ] = h[ y[ M - H ] + 1 ], d[ b + 5 ] = h[ y[ M - H ] + 2 ], d[ b + 6 ] = h[ y[ M - 1 ] ], d[ b + 7 ] = h[ y[ M - 1 ] + 1 ], d[ b + 8 ] = h[ y[ M - 1 ] + 2 ], z[ w + 6 ] = z[ w + 2 ], z[ w + 7 ] = z[ w + 3 ], z[ w + 8 ] = z[ w + 4 ], z[ w + 9 ] = z[ w + 5 ], z[ w + 10 ] = f[ u[ M ] ], z[ w + 11 ] = f[ u[ M ] + 1 ], d[ b + 9 ] = d[ b + 3 ], d[ b + 10 ] = d[ b + 4 ], d[ b + 11 ] = d[ b + 5 ], d[ b + 12 ] = d[ b + 6 ], d[ b + 13 ] = d[ b + 7 ], d[ b + 14 ] = d[ b + 8 ], d[ b + 15 ] = h[ y[ M ] ], d[ b + 16 ] = h[ y[ M ] + 1 ], d[ b + 17 ] = h[ y[ M ] + 2 ], w += 12, b += 18;
                  break;
                case 'triangles':
                  for (g = 0, H = u.length; g < H; g++) z[ w ] = f[ u[ g ] ], z[ w + 1 ] = f[ u[ g ] + 1 ], d[ b ] = h[ y[ g ] ], d[ b + 1 ] =
                    h[ y[ g ] + 1 ], d[ b + 2 ] = h[ y[ g ] + 2 ], w += 2, b += 3
              }
            }
            p ? n.clearColor(p[ 0 ] / 255, p[ 1 ] / 255, p[ 2 ] / 255, 1) : n.clearColor(0, 0, 0, 0);
            n.clear(n.COLOR_BUFFER_BIT);
            p = n.createBuffer();
            n.bindBuffer(n.ARRAY_BUFFER, p);
            n.bufferData(n.ARRAY_BUFFER, z, n.STATIC_DRAW);
            n.enableVertexAttribArray(m.positionLocation);
            n.vertexAttribPointer(m.positionLocation, 2, n.FLOAT, !1, 0, 0);
            v = n.createBuffer();
            n.bindBuffer(n.ARRAY_BUFFER, v);
            n.bufferData(n.ARRAY_BUFFER, d, n.STATIC_DRAW);
            n.enableVertexAttribArray(m.colorLocation);
            n.vertexAttribPointer(m.colorLocation,
              3, n.UNSIGNED_BYTE, !1, 0, 0);
            n.uniform2f(m.scaleLocation, D.scaleX, D.scaleY);
            n.uniform2f(m.offsetLocation, D.offsetX, D.offsetY);
            n.drawArrays(n.TRIANGLES, 0, a);
            n.flush();
            n.deleteBuffer(p);
            n.deleteBuffer(v);
            return t
          }, clear: function () {
            d && d.canvas && (d.canvas.width = 0, d.canvas.height = 0);
            A && A.canvas && (A.canvas.width = 0, A.canvas.height = 0);
            A = d = null
          }
        }
      }();
      c.WebGLUtils = e
    });
    (function (c, e) {
      e(c.pdfjsDisplayPatternHelper = {}, c.pdfjsSharedUtil, c.pdfjsDisplayWebGL)
    })(this, function (c, e, u) {
      var y = e.Util, F = e.info, l = e.isArray,
        C = e.error, B = u.WebGLUtils, N = {
          RadialAxial: {
            fromIR: function (c) {
              var d = c[ 1 ], e = c[ 2 ], a = c[ 3 ], l = c[ 4 ], p = c[ 5 ], v = c[ 6 ];
              return {
                type: 'Pattern', getPattern: function (c) {
                  var m;
                  'axial' === d ? m = c.createLinearGradient(a[ 0 ], a[ 1 ], l[ 0 ], l[ 1 ]) : 'radial' === d && (m = c.createRadialGradient(a[ 0 ], a[ 1 ], p, l[ 0 ], l[ 1 ], v));
                  c = 0;
                  for (var t = e.length; c < t; ++c) {
                    var n = e[ c ];
                    m.addColorStop(n[ 0 ], n[ 1 ])
                  }
                  return m
                }
              }
            }
          }
        }, I = function () {
          function c(d, e, a, l, p, v, D, m) {
            var t = e.coords, n = e.colors, z = d.data;
            d = 4 * d.width;
            var k;
            t[ a + 1 ] > t[ l + 1 ] && (k = a, a = l, l = k, k = v, v = D, D = k);
            t[ l +
            1 ] > t[ p + 1 ] && (k = l, l = p, p = k, k = D, D = m, m = k);
            t[ a + 1 ] > t[ l + 1 ] && (k = a, a = l, l = k, k = v, v = D, D = k);
            k = (t[ a ] + e.offsetX) * e.scaleX;
            a = (t[ a + 1 ] + e.offsetY) * e.scaleY;
            var r = (t[ l ] + e.offsetX) * e.scaleX;
            l = (t[ l + 1 ] + e.offsetY) * e.scaleY;
            var g = (t[ p ] + e.offsetX) * e.scaleX;
            e = (t[ p + 1 ] + e.offsetY) * e.scaleY;
            if (!(a >= e)) {
              p = n[ v ];
              t = n[ v + 1 ];
              v = n[ v + 2 ];
              var f = n[ D ], h = n[ D + 1 ];
              D = n[ D + 2 ];
              var w = n[ m ], b = n[ m + 1 ];
              m = n[ m + 2 ];
              for (var u = Math.round(a), n = Math.round(e), E, H, O, M, J, y, C, L, R = u; R <= n; R++) {
                R < l ? (L = R < a ? 0 : a === l ? 1 : (a - R) / (a - l), u = k - (k - r) * L, E = p - (p - f) * L, H = t - (t - h) * L, O = v - (v -
                  D) * L) : (L = R > e ? 1 : l === e ? 0 : (l - R) / (l - e), u = r - (r - g) * L, E = f - (f - w) * L, H = h - (h - b) * L, O = D - (D - m) * L);
                L = R < a ? 0 : R > e ? 1 : (a - R) / (a - e);
                M = k - (k - g) * L;
                J = p - (p - w) * L;
                y = t - (t - b) * L;
                C = v - (v - m) * L;
                L = Math.round(Math.min(u, M));
                for (var B = Math.round(Math.max(u, M)), F = d * R + 4 * L, T = L; T <= B; T++) L = (u - T) / (u - M), L = 0 > L ? 0 : 1 < L ? 1 : L, z[ F++ ] = E - (E - J) * L | 0, z[ F++ ] = H - (H - y) * L | 0, z[ F++ ] = O - (O - C) * L | 0, z[ F++ ] = 255
              }
            }
          }

          return function (d, e, a, l, p, v, u) {
            var m = Math.floor(d[ 0 ]), t = Math.floor(d[ 1 ]), n = Math.ceil(d[ 2 ]) - m;
            d = Math.ceil(d[ 3 ]) - t;
            var z = Math.min(Math.ceil(Math.abs(n * e[ 0 ] * 1.1)),
              3E3);
            e = Math.min(Math.ceil(Math.abs(d * e[ 1 ] * 1.1)), 3E3);
            n /= z;
            d /= e;
            a = {coords: a, colors: l, offsetX: -m, offsetY: -t, scaleX: 1 / n, scaleY: 1 / d};
            l = z + 4;
            var k = e + 4;
            if (B.isEnabled) p = B.drawFigures(z, e, v, p, a), u = u.getCanvas('mesh', l, k, !1), u.context.drawImage(p, 2, 2); else {
              u = u.getCanvas('mesh', l, k, !1);
              l = u.context;
              e = l.createImageData(z, e);
              if (v) for (var r = e.data, z = 0, k = r.length; z < k; z += 4) r[ z ] = v[ 0 ], r[ z + 1 ] = v[ 1 ], r[ z + 2 ] = v[ 2 ], r[ z + 3 ] = 255;
              for (z = 0; z < p.length; z++) {
                v = e;
                var g = p[ z ], k = a, r = g.coords, f = g.colors, h = void 0, w = void 0;
                switch (g.type) {
                  case 'lattice':
                    for (var g =
                      g.verticesPerRow, w = Math.floor(r.length / g) - 1, b = g - 1, h = 0; h < w; h++) for (var y = h * g, F = 0; F < b; F++, y++) c(v, k, r[ y ], r[ y + 1 ], r[ y + g ], f[ y ], f[ y + 1 ], f[ y + g ]), c(v, k, r[ y + g + 1 ], r[ y + 1 ], r[ y + g ], f[ y + g + 1 ], f[ y + 1 ], f[ y + g ]);
                    break;
                  case 'triangles':
                    h = 0;
                    for (w = r.length; h < w; h += 3) c(v, k, r[ h ], r[ h + 1 ], r[ h + 2 ], f[ h ], f[ h + 1 ], f[ h + 2 ]);
                    break;
                  default:
                    C('illigal figure')
                }
              }
              l.putImageData(e, 2, 2)
            }
            p = u.canvas;
            return {canvas: p, offsetX: m - 2 * n, offsetY: t - 2 * d, scaleX: n, scaleY: d}
          }
        }();
      N.Mesh = {
        fromIR: function (c) {
          var d = c[ 2 ], e = c[ 3 ], a = c[ 4 ], l = c[ 5 ], p = c[ 6 ], v = c[ 8 ];
          return {
            type: 'Pattern',
            getPattern: function (c, m, t) {
              var n;
              if (t) n = y.singularValueDecompose2dScale(c.mozCurrentTransform); else if (n = y.singularValueDecompose2dScale(m.baseTransform), p) {
                var u = y.singularValueDecompose2dScale(p);
                n = [ n[ 0 ] * u[ 0 ], n[ 1 ] * u[ 1 ] ]
              }
              n = I(l, n, d, e, a, t ? null : v, m.cachedCanvases);
              t || (c.setTransform.apply(c, m.baseTransform), p && c.transform.apply(c, p));
              c.translate(n.offsetX, n.offsetY);
              c.scale(n.scaleX, n.scaleY);
              return c.createPattern(n.canvas, 'no-repeat')
            }
          }
        }
      };
      N.Dummy = {
        fromIR: function () {
          return {
            type: 'Pattern', getPattern: function () {
              return 'hotpink'
            }
          }
        }
      };
      e = function () {
        function c(d, e, a, l, p) {
          this.operatorList = d[ 2 ];
          this.matrix = d[ 3 ] || [ 1, 0, 0, 1, 0, 0 ];
          this.bbox = d[ 4 ];
          this.xstep = d[ 5 ];
          this.ystep = d[ 6 ];
          this.paintType = d[ 7 ];
          this.tilingType = d[ 8 ];
          this.color = e;
          this.canvasGraphicsFactory = l;
          this.baseTransform = p;
          this.type = 'Pattern';
          this.ctx = a
        }

        c.prototype = {
          createPatternCanvas: function (c) {
            var e = this.operatorList, a = this.bbox, l = this.xstep, p = this.ystep, v = this.paintType,
              u = this.color, m = this.canvasGraphicsFactory;
            F('TilingType: ' + this.tilingType);
            var t = a[ 0 ], n = a[ 1 ], z = a[ 2 ], k = a[ 3 ],
              r = [ t, n ], g = [ t + l, n + p ], f = g[ 0 ] - r[ 0 ], g = g[ 1 ] - r[ 1 ],
              h = y.singularValueDecompose2dScale(this.matrix), w = y.singularValueDecompose2dScale(this.baseTransform),
              h = [ h[ 0 ] * w[ 0 ], h[ 1 ] * w[ 1 ] ], f = Math.min(Math.ceil(Math.abs(f * h[ 0 ])), 3E3),
              g = Math.min(Math.ceil(Math.abs(g * h[ 1 ])), 3E3), h = c.cachedCanvases.getCanvas('pattern', f, g, !0),
              w = h.context, m = m.createCanvasGraphics(w);
            m.groupLevel = c.groupLevel;
            this.setFillAndStrokeStyleToContext(w, v, u);
            this.setScale(f, g, l, p);
            this.transformToScale(m);
            m.transform.apply(m, [ 1, 0, 0, 1, -r[ 0 ], -r[ 1 ] ]);
            this.clipBbox(m, a, t, n, z, k);
            m.executeOperatorList(e);
            return h.canvas
          }, setScale: function (c, e, a, l) {
            this.scale = [ c / a, e / l ]
          }, transformToScale: function (c) {
            var e = this.scale;
            c.transform.apply(c, [ e[ 0 ], 0, 0, e[ 1 ], 0, 0 ])
          }, scaleToContext: function () {
            var c = this.scale;
            this.ctx.scale(1 / c[ 0 ], 1 / c[ 1 ])
          }, clipBbox: function (c, e, a, u, p, v) {
            e && l(e) && 4 === e.length && (c.ctx.rect(a, u, p - a, v - u), c.clip(), c.endPath())
          }, setFillAndStrokeStyleToContext: function (c, e, a) {
            switch (e) {
              case 1:
                e = this.ctx;
                c.fillStyle = e.fillStyle;
                c.strokeStyle = e.strokeStyle;
                break;
              case 2:
                e = y.makeCssRgb(a[ 0 ], a[ 1 ], a[ 2 ]);
                c.fillStyle = e;
                c.strokeStyle = e;
                break;
              default:
                C('Unsupported paint type: ' + e)
            }
          }, getPattern: function (c, e) {
            var a = this.createPatternCanvas(e);
            c = this.ctx;
            c.setTransform.apply(c, this.baseTransform);
            c.transform.apply(c, this.matrix);
            this.scaleToContext();
            return c.createPattern(a, 'repeat')
          }
        };
        return c
      }();
      c.getShadingPatternFromIR = function (c) {
        var d = N[ c[ 0 ] ];
        d || C('Unknown IR type: ' + c[ 0 ]);
        return d.fromIR(c)
      };
      c.TilingPattern = e
    });
    (function (c, e) {
      e(c.pdfjsDisplayCanvas = {},
        c.pdfjsSharedUtil, c.pdfjsDisplayDOMUtils, c.pdfjsDisplayPatternHelper, c.pdfjsDisplayWebGL)
    })(this, function (c, e, u, y, F) {
      function l(a, b) {
        var c = document.createElement('canvas');
        c.width = a;
        c.height = b;
        return c
      }

      function C(a) {
        a.mozCurrentTransform || (a._originalSave = a.save, a._originalRestore = a.restore, a._originalRotate = a.rotate, a._originalScale = a.scale, a._originalTranslate = a.translate, a._originalTransform = a.transform, a._originalSetTransform = a.setTransform, a._transformMatrix = a._transformMatrix || [ 1, 0, 0, 1, 0, 0 ],
          a._transformStack = [], Object.defineProperty(a, 'mozCurrentTransform', {
          get: function () {
            return this._transformMatrix
          }
        }), Object.defineProperty(a, 'mozCurrentTransformInverse', {
          get: function () {
            var a = this._transformMatrix, b = a[ 0 ], c = a[ 1 ], d = a[ 2 ], e = a[ 3 ], f = a[ 4 ], a = a[ 5 ],
              g = b * e - c * d, h = c * d - b * e;
            return [ e / g, c / h, d / h, b / g, (e * f - d * a) / h, (c * f - b * a) / g ]
          }
        }), a.save = function () {
          var a = this._transformMatrix;
          this._transformStack.push(a);
          this._transformMatrix = a.slice(0, 6);
          this._originalSave()
        }, a.restore = function () {
          var a = this._transformStack.pop();
          a && (this._transformMatrix = a, this._originalRestore())
        }, a.translate = function (a, b) {
          var c = this._transformMatrix;
          c[ 4 ] = c[ 0 ] * a + c[ 2 ] * b + c[ 4 ];
          c[ 5 ] = c[ 1 ] * a + c[ 3 ] * b + c[ 5 ];
          this._originalTranslate(a, b)
        }, a.scale = function (a, b) {
          var c = this._transformMatrix;
          c[ 0 ] *= a;
          c[ 1 ] *= a;
          c[ 2 ] *= b;
          c[ 3 ] *= b;
          this._originalScale(a, b)
        }, a.transform = function (b, c, d, e, f, g) {
          var h = this._transformMatrix;
          this._transformMatrix = [ h[ 0 ] * b + h[ 2 ] * c, h[ 1 ] * b + h[ 3 ] * c, h[ 0 ] * d + h[ 2 ] * e, h[ 1 ] * d + h[ 3 ] * e, h[ 0 ] * f + h[ 2 ] * g + h[ 4 ], h[ 1 ] * f + h[ 3 ] * g + h[ 5 ] ];
          a._originalTransform(b, c, d,
            e, f, g)
        }, a.setTransform = function (b, c, d, e, f, g) {
          this._transformMatrix = [ b, c, d, e, f, g ];
          a._originalSetTransform(b, c, d, e, f, g)
        }, a.rotate = function (a) {
          var b = Math.cos(a), c = Math.sin(a), d = this._transformMatrix;
          this._transformMatrix = [ d[ 0 ] * b + d[ 2 ] * c, d[ 1 ] * b + d[ 3 ] * c, d[ 0 ] * -c + d[ 2 ] * b, d[ 1 ] * -c + d[ 3 ] * b, d[ 4 ], d[ 5 ] ];
          this._originalRotate(a)
        })
      }

      function B(a) {
        var b = a.width, c = a.height, d, e, f = b + 1, g = new Uint8Array(f * (c + 1)),
          h = new Uint8Array([ 0, 2, 4, 0, 1, 0, 5, 4, 8, 10, 0, 8, 0, 2, 1, 0 ]), k = b + 7 & -8, l = a.data,
          n = new Uint8Array(k * c), m = 0;
        a = 0;
        for (d = l.length; a <
        d; a++) {
          e = 128;
          for (var U = l[ a ]; 0 < e;) n[ m++ ] = U & e ? 0 : 255, e >>= 1
        }
        m = l = 0;
        0 !== n[ m ] && (g[ 0 ] = 1, ++l);
        for (d = 1; d < b; d++) n[ m ] !== n[ m + 1 ] && (g[ d ] = n[ m ] ? 2 : 1, ++l), m++;
        0 !== n[ m ] && (g[ d ] = 2, ++l);
        for (a = 1; a < c; a++) {
          m = a * k;
          e = a * f;
          n[ m - k ] !== n[ m ] && (g[ e ] = n[ m ] ? 1 : 8, ++l);
          U = (n[ m ] ? 4 : 0) + (n[ m - k ] ? 8 : 0);
          for (d = 1; d < b; d++) U = (U >> 2) + (n[ m + 1 ] ? 4 : 0) + (n[ m - k + 1 ] ? 8 : 0), h[ U ] && (g[ e + d ] = h[ U ], ++l), m++;
          n[ m - k ] !== n[ m ] && (g[ e + d ] = n[ m ] ? 2 : 4, ++l);
          if (1E3 < l) return null
        }
        m = k * (c - 1);
        e = a * f;
        0 !== n[ m ] && (g[ e ] = 8, ++l);
        for (d = 1; d < b; d++) n[ m ] !== n[ m + 1 ] && (g[ e + d ] = n[ m ] ? 4 : 8, ++l), m++;
        0 !== n[ m ] && (g[ e +
        d ] = 4, ++l);
        if (1E3 < l) return null;
        var h = new Int32Array([ 0, f, -1, 0, -f, 0, 0, 0, 1 ]), P = [];
        for (a = 0; l && a <= c; a++) {
          k = a * f;
          for (n = k + b; k < n && !g[ k ];) k++;
          if (k !== n) {
            n = [ k % f, a ];
            m = g[ k ];
            d = k;
            do {
              e = h[ m ];
              do k += e; while (!g[ k ]);
              e = g[ k ];
              5 !== e && 10 !== e ? (m = e, g[ k ] = 0) : (m = e & 51 * m >> 4, g[ k ] &= m >> 2 | m << 2);
              n.push(k % f);
              n.push(k / f | 0);
              --l
            } while (d !== k);
            P.push(n);
            --a
          }
        }
        return function (a) {
          a.save();
          a.scale(1 / b, -1 / c);
          a.translate(0, -c);
          a.beginPath();
          for (var d = 0, e = P.length; d < e; d++) {
            var f = P[ d ];
            a.moveTo(f[ 0 ], f[ 1 ]);
            for (var g = 2, h = f.length; g < h; g += 2) a.lineTo(f[ g ],
              f[ g + 1 ])
          }
          a.fill();
          a.beginPath();
          a.restore()
        }
      }

      var N = e.FONT_IDENTITY_MATRIX, I = e.IDENTITY_MATRIX, E = e.ImageKind, d = e.OPS, A = e.TextRenderingMode,
        a = e.Uint32ArrayView, x = e.Util, p = e.assert, v = e.info, D = e.isNum, m = e.isArray, t = e.isLittleEndian,
        n = e.error, z = e.shadow, k = e.warn, r = y.TilingPattern, g = y.getShadingPatternFromIR, f = F.WebGLUtils,
        h = u.hasCanvasTypedArrays, w = {
          get value() {
            return z(w, 'value', h())
          }
        }, b = {
          get value() {
            return z(b, 'value', t())
          }
        }, K = function () {
          function a() {
            this.cache = Object.create(null)
          }

          a.prototype = {
            getCanvas: function (a,
                                 b, c, d) {
              void 0 !== this.cache[ a ] ? (a = this.cache[ a ], a.canvas.width = b, a.canvas.height = c, a.context.setTransform(1, 0, 0, 1, 0, 0)) : (b = l(b, c), c = b.getContext('2d'), d && C(c), this.cache[ a ] = a = {
                canvas: b,
                context: c
              });
              return a
            }, clear: function () {
              for (var a in this.cache) {
                var b = this.cache[ a ];
                b.canvas.width = 0;
                b.canvas.height = 0;
                delete this.cache[ a ]
              }
            }
          };
          return a
        }(), S = function () {
          function a(b) {
            this.alphaIsShape = !1;
            this.fontSize = 0;
            this.fontSizeScale = 1;
            this.textMatrix = I;
            this.textMatrixScale = 1;
            this.fontMatrix = N;
            this.wordSpacing = this.charSpacing =
              this.lineY = this.lineX = this.y = this.x = this.leading = 0;
            this.textHScale = 1;
            this.textRenderingMode = A.FILL;
            this.textRise = 0;
            this.strokeColor = this.fillColor = '#000000';
            this.patternFill = !1;
            this.lineWidth = this.strokeAlpha = this.fillAlpha = 1;
            this.resumeSMaskCtx = this.activeSMask = null;
            this.old = b
          }

          a.prototype = {
            clone: function () {
              return Object.create(this)
            }, setCurrentPoint: function (a, b) {
              this.x = a;
              this.y = b
            }
          };
          return a
        }();
      e = function () {
        function c(a, b, d, e) {
          this.ctx = a;
          this.current = new S;
          this.stateStack = [];
          this.pendingClip = null;
          this.pendingEOFill = !1;
          this.xobjs = this.res = null;
          this.commonObjs = b;
          this.objs = d;
          this.imageLayer = e;
          this.groupStack = [];
          this.baseTransform = this.processingType3 = null;
          this.baseTransformStack = [];
          this.groupLevel = 0;
          this.smaskStack = [];
          this.smaskCounter = 0;
          this.tempSMask = null;
          this.cachedCanvases = new K;
          a && C(a);
          this.cachedGetSinglePixelWidth = null
        }

        function e(c, d) {
          if ('undefined' !== typeof ImageData && d instanceof ImageData) c.putImageData(d, 0, 0); else {
            var f = d.height, g = d.width, h = f % 16, f = (f - h) / 16, k = 0 === h ? f : f + 1,
              l = c.createImageData(g,
                16), Q = 0, m, t = d.data, q = l.data, r, p, u;
            if (d.kind === E.GRAYSCALE_1BPP) {
              var v = t.byteLength, q = w.value ? new Uint32Array(q.buffer) : new a(q), z = q.length, A = g + 7 >> 3,
                x = b.value || !w.value ? 4278190080 : 255;
              for (r = 0; r < k; r++) {
                u = r < f ? 16 : h;
                for (p = m = 0; p < u; p++) {
                  for (var y = v - Q, D = 0, y = y > A ? g : 8 * y - 7, C = y & -8, F = 0, B = 0; D < C; D += 8) B = t[ Q++ ], q[ m++ ] = B & 128 ? 4294967295 : x, q[ m++ ] = B & 64 ? 4294967295 : x, q[ m++ ] = B & 32 ? 4294967295 : x, q[ m++ ] = B & 16 ? 4294967295 : x, q[ m++ ] = B & 8 ? 4294967295 : x, q[ m++ ] = B & 4 ? 4294967295 : x, q[ m++ ] = B & 2 ? 4294967295 : x, q[ m++ ] = B & 1 ? 4294967295 : x;
                  for (; D < y; D++) 0 ===
                  F && (B = t[ Q++ ], F = 128), q[ m++ ] = B & F ? 4294967295 : x, F >>= 1
                }
                for (; m < z;) q[ m++ ] = 0;
                c.putImageData(l, 0, 16 * r)
              }
            } else if (d.kind === E.RGBA_32BPP) {
              p = 0;
              u = 64 * g;
              for (r = 0; r < f; r++) q.set(t.subarray(Q, Q + u)), Q += u, c.putImageData(l, 0, p), p += 16;
              r < k && (q.set(t.subarray(Q, Q + g * h * 4)), c.putImageData(l, 0, p))
            } else if (d.kind === E.RGB_24BPP) for (u = 16 * g, r = 0; r < k; r++) {
              r >= f && (u = h, u *= g);
              m = 0;
              for (p = u; p--;) q[ m++ ] = t[ Q++ ], q[ m++ ] = t[ Q++ ], q[ m++ ] = t[ Q++ ], q[ m++ ] = 255;
              c.putImageData(l, 0, 16 * r)
            } else n('bad image kind: ' + d.kind)
          }
        }

        function h(a, b) {
          for (var c = b.height,
                 d = b.width, e = c % 16, c = (c - e) / 16, f = 0 === e ? c : c + 1, g = a.createImageData(d, 16), k = 0, l = b.data, n = g.data, q = 0; q < f; q++) {
            for (var m = q < c ? 16 : e, t = 3, r = 0; r < m; r++) for (var p = 0, u = 0; u < d; u++) {
              if (!p) var v = l[ k++ ], p = 128;
              n[ t ] = v & p ? 0 : 255;
              t += 4;
              p >>= 1
            }
            a.putImageData(g, 0, 16 * q)
          }
        }

        function l(a, b) {
          for (var c = 'strokeStyle fillStyle fillRule globalAlpha lineWidth lineCap lineJoin miterLimit globalCompositeOperation font'.split(' '), d = 0, e = c.length; d < e; d++) {
            var f = c[ d ];
            void 0 !== a[ f ] && (b[ f ] = a[ f ])
          }
          void 0 !== a.setLineDash ? (b.setLineDash(a.getLineDash()),
            b.lineDashOffset = a.lineDashOffset) : void 0 !== a.mozDashOffset && (b.mozDash = a.mozDash, b.mozDashOffset = a.mozDashOffset)
        }

        function t(a, b, c) {
          for (var d = a.length, e = 1 / 255, f = 3; f < d; f += 4) b[ f ] = b[ f ] * (c ? c[ a[ f ] ] : a[ f ]) * e | 0
        }

        function u(a, b, c) {
          for (var d = a.length, e = 3; e < d; e += 4) {
            var f = 77 * a[ e - 3 ] + 152 * a[ e - 2 ] + 28 * a[ e - 1 ];
            b[ e ] = c ? b[ e ] * c[ f >> 8 ] >> 8 : b[ e ] * f >> 16
          }
        }

        function y(a, b, c) {
          var d = b.canvas, e = b.context;
          a.setTransform(b.scaleX, 0, 0, b.scaleY, b.offsetX, b.offsetY);
          var g = b.backdrop || null;
          if (!b.transferMap && f.isEnabled) c = f.composeSMask(c.canvas,
            d, {
              subtype: b.subtype,
              backdrop: g
            }), a.setTransform(1, 0, 0, 1, 0, 0), a.drawImage(c, b.offsetX, b.offsetY); else {
            var h = d.width, k = d.height, l = b.transferMap, n = !!g, q = n ? g[ 0 ] : 0, m = n ? g[ 1 ] : 0,
              g = n ? g[ 2 ] : 0;
            b = 'Luminosity' === b.subtype ? u : t;
            for (var r = Math.min(k, Math.ceil(1048576 / h)), p = 0; p < k; p += r) {
              var v = Math.min(r, k - p), x = e.getImageData(0, p, h, v), v = c.getImageData(0, p, h, v);
              if (n) for (var w = x.data, z = q, A = m, D = g, E = w.length, C = 3; C < E; C += 4) {
                var B = w[ C ];
                if (0 === B) w[ C - 3 ] = z, w[ C - 2 ] = A, w[ C - 1 ] = D; else if (255 > B) {
                  var F = 255 - B;
                  w[ C - 3 ] = w[ C - 3 ] * B + z * F >> 8;
                  w[ C -
                  2 ] = w[ C - 2 ] * B + A * F >> 8;
                  w[ C - 1 ] = w[ C - 1 ] * B + D * F >> 8
                }
              }
              b(x.data, v.data, l);
              e.putImageData(v, 0, p)
            }
            a.drawImage(d, 0, 0)
          }
        }

        var F = [ 'butt', 'round', 'square' ], ba = [ 'miter', 'round', 'bevel' ], X = {}, T = {};
        c.prototype = {
          beginDrawing: function (a, b, c) {
            var d = this.ctx.canvas.width, e = this.ctx.canvas.height;
            this.ctx.save();
            this.ctx.fillStyle = 'rgb(255, 255, 255)';
            this.ctx.fillRect(0, 0, d, e);
            this.ctx.restore();
            c && (c = this.cachedCanvases.getCanvas('transparent', d, e, !0), this.compositeCtx = this.ctx, this.transparentCanvas = c.canvas, this.ctx = c.context,
              this.ctx.save(), this.ctx.transform.apply(this.ctx, this.compositeCtx.mozCurrentTransform));
            this.ctx.save();
            a && this.ctx.transform.apply(this.ctx, a);
            this.ctx.transform.apply(this.ctx, b.transform);
            this.baseTransform = this.ctx.mozCurrentTransform.slice();
            this.imageLayer && this.imageLayer.beginLayout()
          }, executeOperatorList: function (a, b, c, e) {
            var f = a.argsArray;
            a = a.fnArray;
            b = b || 0;
            var g = f.length;
            if (g === b) return b;
            for (var h = 10 < g - b && 'function' === typeof c, k = h ? Date.now() + 15 : 0, l = 0, n = this.commonObjs, q = this.objs, m; ;) {
              if (void 0 !==
                e && b === e.nextBreakPoint) return e.breakIt(b, c), b;
              m = a[ b ];
              if (m !== d.dependency) this[ m ].apply(this, f[ b ]); else {
                m = f[ b ];
                for (var r = 0, t = m.length; r < t; r++) {
                  var p = m[ r ], u = 'g' === p[ 0 ] && '_' === p[ 1 ] ? n : q;
                  if (!u.isResolved(p)) return u.get(p, c), b
                }
              }
              b++;
              if (b === g) return b;
              if (h && 10 < ++l) {
                if (Date.now() > k) return c(), b;
                l = 0
              }
            }
          }, endDrawing: function () {
            null !== this.current.activeSMask && this.endSMaskGroup();
            this.ctx.restore();
            this.transparentCanvas && (this.ctx = this.compositeCtx, this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.drawImage(this.transparentCanvas,
              0, 0), this.ctx.restore(), this.transparentCanvas = null);
            this.cachedCanvases.clear();
            f.clear();
            this.imageLayer && this.imageLayer.endLayout()
          }, setLineWidth: function (a) {
            this.current.lineWidth = a;
            this.ctx.lineWidth = a
          }, setLineCap: function (a) {
            this.ctx.lineCap = F[ a ]
          }, setLineJoin: function (a) {
            this.ctx.lineJoin = ba[ a ]
          }, setMiterLimit: function (a) {
            this.ctx.miterLimit = a
          }, setDash: function (a, b) {
            var c = this.ctx;
            void 0 !== c.setLineDash ? (c.setLineDash(a), c.lineDashOffset = b) : (c.mozDash = a, c.mozDashOffset = b)
          }, setRenderingIntent: function (a) {
          },
          setFlatness: function (a) {
          }, setGState: function (a) {
            for (var b = 0, c = a.length; b < c; b++) {
              var d = a[ b ], e = d[ 1 ];
              switch (d[ 0 ]) {
                case 'LW':
                  this.setLineWidth(e);
                  break;
                case 'LC':
                  this.setLineCap(e);
                  break;
                case 'LJ':
                  this.setLineJoin(e);
                  break;
                case 'ML':
                  this.setMiterLimit(e);
                  break;
                case 'D':
                  this.setDash(e[ 0 ], e[ 1 ]);
                  break;
                case 'RI':
                  this.setRenderingIntent(e);
                  break;
                case 'FL':
                  this.setFlatness(e);
                  break;
                case 'Font':
                  this.setFont(e[ 0 ], e[ 1 ]);
                  break;
                case 'CA':
                  this.current.strokeAlpha = d[ 1 ];
                  break;
                case 'ca':
                  this.current.fillAlpha = d[ 1 ];
                  this.ctx.globalAlpha = d[ 1 ];
                  break;
                case 'BM':
                  e && e.name && 'Normal' !== e.name ? (d = e.name.replace(/([A-Z])/g, function (a) {
                    return '-' + a.toLowerCase()
                  }).substring(1), this.ctx.globalCompositeOperation = d, this.ctx.globalCompositeOperation !== d && k('globalCompositeOperation "' + d + '" is not supported')) : this.ctx.globalCompositeOperation = 'source-over';
                  break;
                case 'SMask':
                  this.current.activeSMask && (0 < this.stateStack.length && this.stateStack[ this.stateStack.length - 1 ].activeSMask === this.current.activeSMask ? this.suspendSMaskGroup() :
                    this.endSMaskGroup()), this.current.activeSMask = e ? this.tempSMask : null, this.current.activeSMask && this.beginSMaskGroup(), this.tempSMask = null
              }
            }
          }, beginSMaskGroup: function () {
            var a = this.current.activeSMask,
              b = this.cachedCanvases.getCanvas('smaskGroupAt' + this.groupLevel, a.canvas.width, a.canvas.height, !0),
              c = this.ctx, d = c.mozCurrentTransform;
            this.ctx.save();
            b = b.context;
            b.scale(1 / a.scaleX, 1 / a.scaleY);
            b.translate(-a.offsetX, -a.offsetY);
            b.transform.apply(b, d);
            a.startTransformInverse = b.mozCurrentTransformInverse;
            l(c, b);
            this.ctx = b;
            this.setGState([ [ 'BM', 'Normal' ], [ 'ca', 1 ], [ 'CA', 1 ] ]);
            this.groupStack.push(c);
            this.groupLevel++
          }, suspendSMaskGroup: function () {
            var a = this.ctx;
            this.groupLevel--;
            this.ctx = this.groupStack.pop();
            y(this.ctx, this.current.activeSMask, a);
            this.ctx.restore();
            this.ctx.save();
            l(a, this.ctx);
            this.current.resumeSMaskCtx = a;
            var b = x.transform(this.current.activeSMask.startTransformInverse, a.mozCurrentTransform);
            this.ctx.transform.apply(this.ctx, b);
            a.save();
            a.setTransform(1, 0, 0, 1, 0, 0);
            a.clearRect(0, 0,
              a.canvas.width, a.canvas.height);
            a.restore()
          }, resumeSMaskGroup: function () {
            var a = this.ctx;
            this.ctx = this.current.resumeSMaskCtx;
            this.groupStack.push(a);
            this.groupLevel++
          }, endSMaskGroup: function () {
            var a = this.ctx;
            this.groupLevel--;
            this.ctx = this.groupStack.pop();
            y(this.ctx, this.current.activeSMask, a);
            this.ctx.restore();
            l(a, this.ctx);
            a = x.transform(this.current.activeSMask.startTransformInverse, a.mozCurrentTransform);
            this.ctx.transform.apply(this.ctx, a)
          }, save: function () {
            this.ctx.save();
            var a = this.current;
            this.stateStack.push(a);
            this.current = a.clone();
            this.current.resumeSMaskCtx = null
          }, restore: function () {
            this.current.resumeSMaskCtx && this.resumeSMaskGroup();
            null === this.current.activeSMask || 0 !== this.stateStack.length && this.stateStack[ this.stateStack.length - 1 ].activeSMask === this.current.activeSMask || this.endSMaskGroup();
            0 !== this.stateStack.length && (this.current = this.stateStack.pop(), this.ctx.restore(), this.cachedGetSinglePixelWidth = this.pendingClip = null)
          }, transform: function (a, b, c, d, e, f) {
            this.ctx.transform(a,
              b, c, d, e, f);
            this.cachedGetSinglePixelWidth = null
          }, constructPath: function (a, b) {
            for (var c = this.ctx, e = this.current, f = e.x, g = e.y, h = 0, k = 0, l = a.length; h < l; h++) switch (a[ h ] | 0) {
              case d.rectangle:
                var f = b[ k++ ], g = b[ k++ ], m = b[ k++ ], q = b[ k++ ];
                0 === m && (m = this.getSinglePixelWidth());
                0 === q && (q = this.getSinglePixelWidth());
                m = f + m;
                q = g + q;
                this.ctx.moveTo(f, g);
                this.ctx.lineTo(m, g);
                this.ctx.lineTo(m, q);
                this.ctx.lineTo(f, q);
                this.ctx.lineTo(f, g);
                this.ctx.closePath();
                break;
              case d.moveTo:
                f = b[ k++ ];
                g = b[ k++ ];
                c.moveTo(f, g);
                break;
              case d.lineTo:
                f =
                  b[ k++ ];
                g = b[ k++ ];
                c.lineTo(f, g);
                break;
              case d.curveTo:
                f = b[ k + 4 ];
                g = b[ k + 5 ];
                c.bezierCurveTo(b[ k ], b[ k + 1 ], b[ k + 2 ], b[ k + 3 ], f, g);
                k += 6;
                break;
              case d.curveTo2:
                c.bezierCurveTo(f, g, b[ k ], b[ k + 1 ], b[ k + 2 ], b[ k + 3 ]);
                f = b[ k + 2 ];
                g = b[ k + 3 ];
                k += 4;
                break;
              case d.curveTo3:
                f = b[ k + 2 ];
                g = b[ k + 3 ];
                c.bezierCurveTo(b[ k ], b[ k + 1 ], f, g, f, g);
                k += 4;
                break;
              case d.closePath:
                c.closePath()
            }
            e.setCurrentPoint(f, g)
          }, closePath: function () {
            this.ctx.closePath()
          }, stroke: function (a) {
            a = 'undefined' !== typeof a ? a : !0;
            var b = this.ctx, c = this.current.strokeColor;
            b.lineWidth =
              Math.max(.65 * this.getSinglePixelWidth(), this.current.lineWidth);
            b.globalAlpha = this.current.strokeAlpha;
            c && c.hasOwnProperty('type') && 'Pattern' === c.type ? (b.save(), b.strokeStyle = c.getPattern(b, this), b.stroke(), b.restore()) : b.stroke();
            a && this.consumePath();
            b.globalAlpha = this.current.fillAlpha
          }, closeStroke: function () {
            this.closePath();
            this.stroke()
          }, fill: function (a) {
            a = 'undefined' !== typeof a ? a : !0;
            var b = this.ctx, c = this.current.fillColor, d = !1;
            this.current.patternFill && (b.save(), this.baseTransform && b.setTransform.apply(b,
              this.baseTransform), b.fillStyle = c.getPattern(b, this), d = !0);
            this.pendingEOFill ? (void 0 !== b.mozFillRule ? (b.mozFillRule = 'evenodd', b.fill(), b.mozFillRule = 'nonzero') : b.fill('evenodd'), this.pendingEOFill = !1) : b.fill();
            d && b.restore();
            a && this.consumePath()
          }, eoFill: function () {
            this.pendingEOFill = !0;
            this.fill()
          }, fillStroke: function () {
            this.fill(!1);
            this.stroke(!1);
            this.consumePath()
          }, eoFillStroke: function () {
            this.pendingEOFill = !0;
            this.fillStroke()
          }, closeFillStroke: function () {
            this.closePath();
            this.fillStroke()
          },
          closeEOFillStroke: function () {
            this.pendingEOFill = !0;
            this.closePath();
            this.fillStroke()
          }, endPath: function () {
            this.consumePath()
          }, clip: function () {
            this.pendingClip = X
          }, eoClip: function () {
            this.pendingClip = T
          }, beginText: function () {
            this.current.textMatrix = I;
            this.current.textMatrixScale = 1;
            this.current.x = this.current.lineX = 0;
            this.current.y = this.current.lineY = 0
          }, endText: function () {
            var a = this.pendingTextPaths, b = this.ctx;
            if (void 0 === a) b.beginPath(); else {
              b.save();
              b.beginPath();
              for (var c = 0; c < a.length; c++) {
                var d = a[ c ];
                b.setTransform.apply(b, d.transform);
                b.translate(d.x, d.y);
                d.addToPath(b, d.fontSize)
              }
              b.restore();
              b.clip();
              b.beginPath();
              delete this.pendingTextPaths
            }
          }, setCharSpacing: function (a) {
            this.current.charSpacing = a
          }, setWordSpacing: function (a) {
            this.current.wordSpacing = a
          }, setHScale: function (a) {
            this.current.textHScale = a / 100
          }, setLeading: function (a) {
            this.current.leading = -a
          }, setFont: function (a, b) {
            var c = this.commonObjs.get(a), d = this.current;
            c || n('Can\'t find font for ' + a);
            d.fontMatrix = c.fontMatrix ? c.fontMatrix : N;
            0 !==
            d.fontMatrix[ 0 ] && 0 !== d.fontMatrix[ 3 ] || k('Invalid font matrix for font ' + a);
            0 > b ? (b = -b, d.fontDirection = -1) : d.fontDirection = 1;
            this.current.font = c;
            this.current.fontSize = b;
            if (!c.isType3Font) {
              var d = c.black ? c.bold ? '900' : 'bold' : c.bold ? 'bold' : 'normal',
                e = c.italic ? 'italic' : 'normal', c = '"' + (c.loadedName || 'sans-serif') + '", ' + c.fallbackName,
                f = 16 > b ? 16 : 100 < b ? 100 : b;
              this.current.fontSizeScale = b / f;
              this.ctx.font = e + ' ' + d + ' ' + f + 'px ' + c
            }
          }, setTextRenderingMode: function (a) {
            this.current.textRenderingMode = a
          }, setTextRise: function (a) {
            this.current.textRise =
              a
          }, moveText: function (a, b) {
            this.current.x = this.current.lineX += a;
            this.current.y = this.current.lineY += b
          }, setLeadingMoveText: function (a, b) {
            this.setLeading(-b);
            this.moveText(a, b)
          }, setTextMatrix: function (a, b, c, d, e, f) {
            this.current.textMatrix = [ a, b, c, d, e, f ];
            this.current.textMatrixScale = Math.sqrt(a * a + b * b);
            this.current.x = this.current.lineX = 0;
            this.current.y = this.current.lineY = 0
          }, nextLine: function () {
            this.moveText(0, this.current.leading)
          }, paintChar: function (a, b, c) {
            var d = this.ctx, e = this.current, f = e.font, g = e.textRenderingMode,
              e = e.fontSize / e.fontSizeScale, h = g & A.FILL_STROKE_MASK, g = !!(g & A.ADD_TO_PATH_FLAG), k;
            if (f.disableFontFace || g) k = f.getPathGenerator(this.commonObjs, a);
            f.disableFontFace ? (d.save(), d.translate(b, c), d.beginPath(), k(d, e), h !== A.FILL && h !== A.FILL_STROKE || d.fill(), h !== A.STROKE && h !== A.FILL_STROKE || d.stroke(), d.restore()) : (h !== A.FILL && h !== A.FILL_STROKE || d.fillText(a, b, c), h !== A.STROKE && h !== A.FILL_STROKE || d.strokeText(a, b, c));
            g && (this.pendingTextPaths || (this.pendingTextPaths = [])).push({
              transform: d.mozCurrentTransform,
              x: b, y: c, fontSize: e, addToPath: k
            })
          }, get isFontSubpixelAAEnabled() {
            var a = document.createElement('canvas').getContext('2d');
            a.scale(1.5, 1);
            a.fillText('I', 0, 10);
            for (var a = a.getImageData(0, 0, 10, 10).data, b = !1, c = 3; c < a.length; c += 4) if (0 < a[ c ] && 255 > a[ c ]) {
              b = !0;
              break
            }
            return z(this, 'isFontSubpixelAAEnabled', b)
          }, showText: function (a) {
            var b = this.current, c = b.font;
            if (c.isType3Font) return this.showType3Text(a);
            var d = b.fontSize;
            if (0 !== d) {
              var e = this.ctx, f = b.fontSizeScale, g = b.charSpacing, h = b.wordSpacing, k = b.fontDirection,
                l = b.textHScale * k, q = a.length, m = c.vertical, n = m ? 1 : -1, r = c.defaultVMetrics,
                p = d * b.fontMatrix[ 0 ], t = b.textRenderingMode === A.FILL && !c.disableFontFace;
              e.save();
              e.transform.apply(e, b.textMatrix);
              e.translate(b.x, b.y + b.textRise);
              b.patternFill && (e.fillStyle = b.fillColor.getPattern(e, this));
              0 < k ? e.scale(l, -1) : e.scale(l, 1);
              var u = b.lineWidth, v = b.textMatrixScale;
              if (0 === v || 0 === u) {
                if (v = b.textRenderingMode & A.FILL_STROKE_MASK, v === A.STROKE || v === A.FILL_STROKE) this.cachedGetSinglePixelWidth = null, u = .65 * this.getSinglePixelWidth()
              } else u /=
                v;
              1 !== f && (e.scale(f, f), u /= f);
              e.lineWidth = u;
              for (v = u = 0; v < q; ++v) {
                var w = a[ v ];
                if (D(w)) u += n * w * d / 1E3; else {
                  var x = !1, z = (w.isSpace ? h : 0) + g, y = w.fontChar, C = w.accent, B, E, F = w.width;
                  if (m) {
                    var H;
                    B = w.vmetric || r;
                    H = w.vmetric ? B[ 1 ] : .5 * F;
                    H = -H * p;
                    E = B[ 2 ] * p;
                    F = B ? -B[ 0 ] : F;
                    B = H / f;
                    E = (u + E) / f
                  } else B = u / f, E = 0;
                  c.remeasure && 0 < F && (H = 1E3 * e.measureText(y).width / d * f, F < H && this.isFontSubpixelAAEnabled ? (H = F / H, x = !0, e.save(), e.scale(H, 1), B /= H) : F !== H && (B += (F - H) / 2E3 * d / f));
                  if (w.isInFont || c.missingFile) t && !C ? e.fillText(y, B, E) : (this.paintChar(y, B, E),
                  C && (w = B + C.offset.x / f, y = E - C.offset.y / f, this.paintChar(C.fontChar, w, y)));
                  u += F * p + z * k;
                  x && e.restore()
                }
              }
              m ? b.y -= u * l : b.x += u * l;
              e.restore()
            }
          }, showType3Text: function (a) {
            var b = this.ctx, c = this.current, d = c.font, e = c.fontSize, f = c.fontDirection,
              g = d.vertical ? 1 : -1, h = c.charSpacing, l = c.wordSpacing, m = c.textHScale * f,
              q = c.fontMatrix || N, n = a.length, p;
            if (c.textRenderingMode !== A.INVISIBLE && 0 !== e) {
              this.cachedGetSinglePixelWidth = null;
              b.save();
              b.transform.apply(b, c.textMatrix);
              b.translate(c.x, c.y);
              b.scale(m, f);
              for (f = 0; f < n; ++f) if (p =
                a[ f ], D(p)) p = g * p * e / 1E3, this.ctx.translate(p, 0), c.x += p * m; else {
                var r = (p.isSpace ? l : 0) + h, t = d.charProcOperatorList[ p.operatorListId ];
                t ? (this.processingType3 = p, this.save(), b.scale(e, e), b.transform.apply(b, q), this.executeOperatorList(t), this.restore(), p = x.applyTransform([ p.width, 0 ], q)[ 0 ] * e + r, b.translate(p, 0), c.x += p * m) : k('Type3 character "' + p.operatorListId + '" is not available')
              }
              b.restore();
              this.processingType3 = null
            }
          }, setCharWidth: function (a, b) {
          }, setCharWidthAndBounds: function (a, b, c, d, e, f) {
            this.ctx.rect(c,
              d, e - c, f - d);
            this.clip();
            this.endPath()
          }, getColorN_Pattern: function (a) {
            if ('TilingPattern' === a[ 0 ]) {
              var b = a[ 1 ], d = this.baseTransform || this.ctx.mozCurrentTransform.slice(), e = this;
              a = new r(a, b, this.ctx, {
                createCanvasGraphics: function (a) {
                  return new c(a, e.commonObjs, e.objs)
                }
              }, d)
            } else a = g(a);
            return a
          }, setStrokeColorN: function () {
            this.current.strokeColor = this.getColorN_Pattern(arguments)
          }, setFillColorN: function () {
            this.current.fillColor = this.getColorN_Pattern(arguments);
            this.current.patternFill = !0
          }, setStrokeRGBColor: function (a,
                                          b, c) {
            a = x.makeCssRgb(a, b, c);
            this.ctx.strokeStyle = a;
            this.current.strokeColor = a
          }, setFillRGBColor: function (a, b, c) {
            a = x.makeCssRgb(a, b, c);
            this.ctx.fillStyle = a;
            this.current.fillColor = a;
            this.current.patternFill = !1
          }, shadingFill: function (a) {
            var b = this.ctx;
            this.save();
            a = g(a);
            b.fillStyle = a.getPattern(b, this, !0);
            var c = b.mozCurrentTransformInverse;
            if (c) {
              var b = b.canvas, d = b.width, e = b.height, b = x.applyTransform([ 0, 0 ], c);
              a = x.applyTransform([ 0, e ], c);
              var f = x.applyTransform([ d, 0 ], c), h = x.applyTransform([ d, e ], c), c = Math.min(b[ 0 ],
                a[ 0 ], f[ 0 ], h[ 0 ]), d = Math.min(b[ 1 ], a[ 1 ], f[ 1 ], h[ 1 ]),
                e = Math.max(b[ 0 ], a[ 0 ], f[ 0 ], h[ 0 ]), b = Math.max(b[ 1 ], a[ 1 ], f[ 1 ], h[ 1 ]);
              this.ctx.fillRect(c, d, e - c, b - d)
            } else this.ctx.fillRect(-1E10, -1E10, 2E10, 2E10);
            this.restore()
          }, beginInlineImage: function () {
            n('Should not call beginInlineImage')
          }, beginImageData: function () {
            n('Should not call beginImageData')
          }, paintFormXObjectBegin: function (a, b) {
            this.save();
            this.baseTransformStack.push(this.baseTransform);
            m(a) && 6 === a.length && this.transform.apply(this, a);
            this.baseTransform = this.ctx.mozCurrentTransform;
            m(b) && 4 === b.length && (this.ctx.rect(b[ 0 ], b[ 1 ], b[ 2 ] - b[ 0 ], b[ 3 ] - b[ 1 ]), this.clip(), this.endPath())
          }, paintFormXObjectEnd: function () {
            this.restore();
            this.baseTransform = this.baseTransformStack.pop()
          }, beginGroup: function (a) {
            this.save();
            var b = this.ctx;
            a.isolated || v('TODO: Support non-isolated groups.');
            a.knockout && k('Knockout groups not supported.');
            var c = b.mozCurrentTransform;
            a.matrix && b.transform.apply(b, a.matrix);
            p(a.bbox, 'Bounding box is required.');
            var d = x.getAxialAlignedBoundingBox(a.bbox, b.mozCurrentTransform),
              d = x.intersect(d, [ 0, 0, b.canvas.width, b.canvas.height ]) || [ 0, 0, 0, 0 ], e = Math.floor(d[ 0 ]),
              f = Math.floor(d[ 1 ]), g = Math.max(Math.ceil(d[ 2 ]) - e, 1), h = Math.max(Math.ceil(d[ 3 ]) - f, 1),
              m = d = 1;
            4096 < g && (d = g / 4096, g = 4096);
            4096 < h && (m = h / 4096, h = 4096);
            var n = 'groupAt' + this.groupLevel;
            a.smask && (n += '_smask_' + this.smaskCounter++ % 2);
            g = this.cachedCanvases.getCanvas(n, g, h, !0);
            h = g.context;
            h.scale(1 / d, 1 / m);
            h.translate(-e, -f);
            h.transform.apply(h, c);
            a.smask ? this.smaskStack.push({
              canvas: g.canvas,
              context: h,
              offsetX: e,
              offsetY: f,
              scaleX: d,
              scaleY: m,
              subtype: a.smask.subtype,
              backdrop: a.smask.backdrop,
              transferMap: a.smask.transferMap || null,
              startTransformInverse: null
            }) : (b.setTransform(1, 0, 0, 1, 0, 0), b.translate(e, f), b.scale(d, m));
            l(b, h);
            this.ctx = h;
            this.setGState([ [ 'BM', 'Normal' ], [ 'ca', 1 ], [ 'CA', 1 ] ]);
            this.groupStack.push(b);
            this.groupLevel++;
            this.current.activeSMask = null
          }, endGroup: function (a) {
            this.groupLevel--;
            var b = this.ctx;
            this.ctx = this.groupStack.pop();
            void 0 !== this.ctx.imageSmoothingEnabled ? this.ctx.imageSmoothingEnabled = !1 : this.ctx.mozImageSmoothingEnabled =
              !1;
            a.smask ? this.tempSMask = this.smaskStack.pop() : this.ctx.drawImage(b.canvas, 0, 0);
            this.restore()
          }, beginAnnotations: function () {
            this.save();
            this.current = new S;
            this.baseTransform && this.ctx.setTransform.apply(this.ctx, this.baseTransform)
          }, endAnnotations: function () {
            this.restore()
          }, beginAnnotation: function (a, b, c) {
            this.save();
            if (m(a) && 4 === a.length) {
              var d = a[ 2 ] - a[ 0 ], e = a[ 3 ] - a[ 1 ];
              document.createElement('canvas').msToBlob && (this.ctx.globalAlpha = .4);
              this.ctx.rect(a[ 0 ], a[ 1 ], d, e);
              this.clip();
              this.endPath()
            }
            this.transform.apply(this,
              b);
            this.transform.apply(this, c)
          }, endAnnotation: function () {
            this.restore()
          }, paintJpegXObject: function (a, b, c) {
            var d = this.objs.get(a);
            if (d) {
              this.save();
              var e = this.ctx;
              e.scale(1 / b, -1 / c);
              e.drawImage(d, 0, 0, d.width, d.height, 0, -c, b, c);
              this.imageLayer && (d = e.mozCurrentTransformInverse, e = this.getCanvasPosition(0, 0), this.imageLayer.appendImage({
                objId: a,
                left: e[ 0 ],
                top: e[ 1 ],
                width: b / d[ 0 ],
                height: c / d[ 3 ]
              }));
              this.restore()
            } else k('Dependent image isn\'t ready yet')
          }, paintImageMaskXObject: function (a) {
            var b = this.ctx, c = a.width,
              d = a.height, e = this.current.fillColor, f = this.current.patternFill, g = this.processingType3;
            g && void 0 === g.compiled && (g.compiled = 1E3 >= c && 1E3 >= d ? B({
              data: a.data,
              width: c,
              height: d
            }) : null);
            g && g.compiled ? g.compiled(b) : (b = this.cachedCanvases.getCanvas('maskCanvas', c, d), g = b.context, g.save(), h(g, a), g.globalCompositeOperation = 'source-in', g.fillStyle = f ? e.getPattern(g, this) : e, g.fillRect(0, 0, c, d), g.restore(), this.paintInlineImageXObject(b.canvas))
          }, paintImageMaskXObjectRepeat: function (a, b, c, d) {
            var e = a.width, f = a.height,
              g = this.current.fillColor, k = this.current.patternFill,
              m = this.cachedCanvases.getCanvas('maskCanvas', e, f), l = m.context;
            l.save();
            h(l, a);
            l.globalCompositeOperation = 'source-in';
            l.fillStyle = k ? g.getPattern(l, this) : g;
            l.fillRect(0, 0, e, f);
            l.restore();
            a = this.ctx;
            g = 0;
            for (k = d.length; g < k; g += 2) a.save(), a.transform(b, 0, 0, c, d[ g ], d[ g + 1 ]), a.scale(1, -1), a.drawImage(m.canvas, 0, 0, e, f, 0, -1, 1, 1), a.restore()
          }, paintImageMaskXObjectGroup: function (a) {
            for (var b = this.ctx, c = this.current.fillColor, d = this.current.patternFill, e = 0, f =
              a.length; e < f; e++) {
              var g = a[ e ], k = g.width, l = g.height, m = this.cachedCanvases.getCanvas('maskCanvas', k, l),
                q = m.context;
              q.save();
              h(q, g);
              q.globalCompositeOperation = 'source-in';
              q.fillStyle = d ? c.getPattern(q, this) : c;
              q.fillRect(0, 0, k, l);
              q.restore();
              b.save();
              b.transform.apply(b, g.transform);
              b.scale(1, -1);
              b.drawImage(m.canvas, 0, 0, k, l, 0, -1, 1, 1);
              b.restore()
            }
          }, paintImageXObject: function (a) {
            (a = this.objs.get(a)) ? this.paintInlineImageXObject(a) : k('Dependent image isn\'t ready yet')
          }, paintImageXObjectRepeat: function (a,
                                                b, c, d) {
            if (a = this.objs.get(a)) {
              for (var e = a.width, f = a.height, g = [], h = 0, l = d.length; h < l; h += 2) g.push({
                transform: [ b, 0, 0, c, d[ h ], d[ h + 1 ] ],
                x: 0,
                y: 0,
                w: e,
                h: f
              });
              this.paintInlineImageXObjectGroup(a, g)
            } else k('Dependent image isn\'t ready yet')
          }, paintInlineImageXObject: function (a) {
            var b = a.width, c = a.height, d = this.ctx;
            this.save();
            d.scale(1 / b, -1 / c);
            var f = d.mozCurrentTransformInverse, g = f[ 0 ], h = f[ 1 ], g = Math.max(Math.sqrt(g * g + h * h), 1),
              h = f[ 2 ], k = f[ 3 ], h = Math.max(Math.sqrt(h * h + k * k), 1), l;
            if (a instanceof HTMLElement || !a.data) k = a;
            else {
              l = this.cachedCanvases.getCanvas('inlineImage', b, c);
              var m = l.context;
              e(m, a);
              k = l.canvas
            }
            for (var q = b, n = c, p = 'prescale1'; 2 < g && 1 < q || 2 < h && 1 < n;) {
              var r = q, t = n;
              2 < g && 1 < q && (r = Math.ceil(q / 2), g /= q / r);
              2 < h && 1 < n && (t = Math.ceil(n / 2), h /= n / t);
              l = this.cachedCanvases.getCanvas(p, r, t);
              m = l.context;
              m.clearRect(0, 0, r, t);
              m.drawImage(k, 0, 0, q, n, 0, 0, r, t);
              k = l.canvas;
              q = r;
              n = t;
              p = 'prescale1' === p ? 'prescale2' : 'prescale1'
            }
            d.drawImage(k, 0, 0, q, n, 0, -c, b, c);
            this.imageLayer && (d = this.getCanvasPosition(0, -c), this.imageLayer.appendImage({
              imgData: a,
              left: d[ 0 ], top: d[ 1 ], width: b / f[ 0 ], height: c / f[ 3 ]
            }));
            this.restore()
          }, paintInlineImageXObjectGroup: function (a, b) {
            var c = this.ctx, d = a.width, f = a.height, g = this.cachedCanvases.getCanvas('inlineImage', d, f);
            e(g.context, a);
            for (var h = 0, k = b.length; h < k; h++) {
              var l = b[ h ];
              c.save();
              c.transform.apply(c, l.transform);
              c.scale(1, -1);
              c.drawImage(g.canvas, l.x, l.y, l.w, l.h, 0, -1, 1, 1);
              this.imageLayer && (l = this.getCanvasPosition(l.x, l.y), this.imageLayer.appendImage({
                imgData: a,
                left: l[ 0 ],
                top: l[ 1 ],
                width: d,
                height: f
              }));
              c.restore()
            }
          }, paintSolidColorImageMask: function () {
            this.ctx.fillRect(0,
              0, 1, 1)
          }, paintXObject: function () {
            k('Unsupported \'paintXObject\' command.')
          }, markPoint: function (a) {
          }, markPointProps: function (a, b) {
          }, beginMarkedContent: function (a) {
          }, beginMarkedContentProps: function (a, b) {
          }, endMarkedContent: function () {
          }, beginCompat: function () {
          }, endCompat: function () {
          }, consumePath: function () {
            var a = this.ctx;
            this.pendingClip && (this.pendingClip === T ? void 0 !== a.mozFillRule ? (a.mozFillRule = 'evenodd', a.clip(), a.mozFillRule = 'nonzero') : a.clip('evenodd') : a.clip(), this.pendingClip = null);
            a.beginPath()
          },
          getSinglePixelWidth: function (a) {
            null === this.cachedGetSinglePixelWidth && (a = this.ctx.mozCurrentTransformInverse, this.cachedGetSinglePixelWidth = Math.sqrt(Math.max(a[ 0 ] * a[ 0 ] + a[ 1 ] * a[ 1 ], a[ 2 ] * a[ 2 ] + a[ 3 ] * a[ 3 ])));
            return this.cachedGetSinglePixelWidth
          }, getCanvasPosition: function (a, b) {
            var c = this.ctx.mozCurrentTransform;
            return [ c[ 0 ] * a + c[ 2 ] * b + c[ 4 ], c[ 1 ] * a + c[ 3 ] * b + c[ 5 ] ]
          }
        };
        for (var W in d) c.prototype[ d[ W ] ] = c.prototype[ W ];
        return c
      }();
      c.CanvasGraphics = e;
      c.createScratchCanvas = l
    });
    (function (c, e) {
      e(c.pdfjsDisplayAPI = {}, c.pdfjsSharedUtil,
        c.pdfjsDisplayFontLoader, c.pdfjsDisplayCanvas, c.pdfjsDisplayMetadata, c.pdfjsDisplayDOMUtils)
    })(this, function (c, e, u, y, B, l, C) {
      function K(a, b, c, d) {
        if (a.destroyed) return Promise.reject(Error('Worker was destroyed'));
        b.disableAutoFetch = J('disableAutoFetch');
        b.disableStream = J('disableStream');
        b.chunkedViewerLoading = !!c;
        c && (b.length = c.length, b.initialData = c.initialData);
        return a.messageHandler.sendWithPromise('GetDocRequest', {
          docId: d,
          source: b,
          disableRange: J('disableRange'),
          maxImageSize: J('maxImageSize'),
          cMapUrl: J('cMapUrl'),
          cMapPacked: J('cMapPacked'),
          disableFontFace: J('disableFontFace'),
          disableCreateObjectURL: J('disableCreateObjectURL'),
          postMessageTransfers: J('postMessageTransfers') && !L
        }).then(function (b) {
          if (a.destroyed) throw Error('Worker was destroyed');
          return b
        })
      }

      var N = e.InvalidPDFException, I = e.MessageHandler, E = e.MissingPDFException, d = e.PageViewport,
        A = e.PasswordResponses, a = e.PasswordException, x = e.StatTimer, p = e.UnexpectedResponseException,
        v = e.UnknownErrorException, D = e.Util, m = e.createPromiseCapability,
        t = e.error, n = e.deprecated, z = e.getVerbosityLevel, k = e.info, r = e.isArrayBuffer, g = e.isSameOrigin,
        f = e.loadJpegStream, h = e.stringToBytes, w = e.globalScope, b = e.warn, Z = u.FontFaceObject,
        fa = u.FontLoader, H = y.CanvasGraphics, O = y.createScratchCanvas, M = B.Metadata, J = l.getDefaultSetting,
        Y = !1, aa, L = !1;
      e = !1;
      // 'undefined' === typeof window && (Y = !0, 'undefined' === typeof require.ensure && (require.ensure = require('node-ensure')), e = !0);
      'undefined' !== typeof __webpack_require__ && (e = !0);
      'undefined' !== typeof requirejs && requirejs.toUrl && (aa =
        requirejs.toUrl('pdfjs-dist/build/pdf.worker.js'));
      u = 'undefined' !== typeof requirejs && requirejs.load;
      var R = e ? function (a) {
        require.ensure([], function () {
          var b = require('./pdf.worker.js');
          a(b.WorkerMessageHandler)
        })
      } : u ? function (a) {
        requirejs([ 'pdfjs-dist/build/pdf.worker' ], function (b) {
          a(b.WorkerMessageHandler)
        })
      } : null, ba = function () {
        function a() {
          this._capability = m();
          this._worker = this._transport = null;
          this.docId = 'd' + b++;
          this.destroyed = !1;
          this.onUnsupportedFeature = this.onProgress = this.onPassword = null
        }

        var b =
          0;
        a.prototype = {
          get promise() {
            return this._capability.promise
          }, destroy: function () {
            this.destroyed = !0;
            return (this._transport ? this._transport.destroy() : Promise.resolve()).then(function () {
              this._transport = null;
              this._worker && (this._worker.destroy(), this._worker = null)
            }.bind(this))
          }, then: function (a, b) {
            return this.promise.then.apply(this.promise, arguments)
          }
        };
        return a
      }(), X = function () {
        function a(b, c) {
          this.length = b;
          this.initialData = c;
          this._rangeListeners = [];
          this._progressListeners = [];
          this._progressiveReadListeners =
            [];
          this._readyCapability = m()
        }

        a.prototype = {
          addRangeListener: function (a) {
            this._rangeListeners.push(a)
          }, addProgressListener: function (a) {
            this._progressListeners.push(a)
          }, addProgressiveReadListener: function (a) {
            this._progressiveReadListeners.push(a)
          }, onDataRange: function (a, b) {
            for (var c = this._rangeListeners, d = 0, e = c.length; d < e; ++d) c[ d ](a, b)
          }, onDataProgress: function (a) {
            this._readyCapability.promise.then(function () {
              for (var b = this._progressListeners, c = 0, d = b.length; c < d; ++c) b[ c ](a)
            }.bind(this))
          }, onDataProgressiveRead: function (a) {
            this._readyCapability.promise.then(function () {
              for (var b =
                this._progressiveReadListeners, c = 0, d = b.length; c < d; ++c) b[ c ](a)
            }.bind(this))
          }, transportReady: function () {
            this._readyCapability.resolve()
          }, requestDataRange: function (a, b) {
            throw Error('Abstract method PDFDataRangeTransport.requestDataRange');
          }, abort: function () {
          }
        };
        return a
      }(), T = function () {
        function a(b, c, d) {
          this.pdfInfo = b;
          this.transport = c;
          this.loadingTask = d
        }

        a.prototype = {
          get numPages() {
            return this.pdfInfo.numPages
          }, get fingerprint() {
            return this.pdfInfo.fingerprint
          }, getPage: function (a) {
            return this.transport.getPage(a)
          },
          getPageIndex: function (a) {
            return this.transport.getPageIndex(a)
          }, getDestinations: function () {
            return this.transport.getDestinations()
          }, getDestination: function (a) {
            return this.transport.getDestination(a)
          }, getPageLabels: function () {
            return this.transport.getPageLabels()
          }, getAttachments: function () {
            return this.transport.getAttachments()
          }, getJavaScript: function () {
            return this.transport.getJavaScript()
          }, getOutline: function () {
            return this.transport.getOutline()
          }, getMetadata: function () {
            return this.transport.getMetadata()
          },
          getData: function () {
            return this.transport.getData()
          }, getDownloadInfo: function () {
            return this.transport.downloadInfoCapability.promise
          }, getStats: function () {
            return this.transport.getStats()
          }, cleanup: function () {
            this.transport.startCleanup()
          }, destroy: function () {
            return this.loadingTask.destroy()
          }
        };
        return a
      }(), W = function () {
        function a(b, c, d) {
          this.pageIndex = b;
          this.pageInfo = c;
          this.transport = d;
          this.stats = new x;
          this.stats.enabled = J('enableStats');
          this.commonObjs = d.commonObjs;
          this.objs = new da;
          this.pendingCleanup =
            this.cleanupAfterRender = !1;
          this.intentStates = Object.create(null);
          this.destroyed = !1
        }

        a.prototype = {
          get pageNumber() {
            return this.pageIndex + 1
          }, get rotate() {
            return this.pageInfo.rotate
          }, get ref() {
            return this.pageInfo.ref
          }, get view() {
            return this.pageInfo.view
          }, getViewport: function (a, b) {
            2 > arguments.length && (b = this.rotate);
            return new d(this.view, a, b, 0, 0)
          }, getAnnotations: function (a) {
            a = a && a.intent || null;
            this.annotationsPromise && this.annotationsIntent === a || (this.annotationsPromise = this.transport.getAnnotations(this.pageIndex,
              a), this.annotationsIntent = a);
            return this.annotationsPromise
          }, render: function (a) {
            function b(a) {
              var d = e.renderTasks.indexOf(f);
              0 <= d && e.renderTasks.splice(d, 1);
              g.cleanupAfterRender && (g.pendingCleanup = !0);
              g._tryCleanup();
              a ? f.capability.reject(a) : f.capability.resolve();
              c.timeEnd('Rendering');
              c.timeEnd('Overall')
            }

            var c = this.stats;
            c.time('Overall');
            this.pendingCleanup = !1;
            var d = 'print' === a.intent ? 'print' : 'display';
            this.intentStates[ d ] || (this.intentStates[ d ] = Object.create(null));
            var e = this.intentStates[ d ];
            e.displayReadyCapability || (e.receivingOperatorList = !0, e.displayReadyCapability = m(), e.operatorList = {
              fnArray: [],
              argsArray: [],
              lastChunk: !1
            }, this.stats.time('Page Request'), this.transport.messageHandler.send('RenderPageRequest', {
              pageIndex: this.pageNumber - 1,
              intent: d
            }));
            var f = new ha(b, a, this.objs, this.commonObjs, e.operatorList, this.pageNumber);
            f.useRequestAnimationFrame = 'print' !== d;
            e.renderTasks || (e.renderTasks = []);
            e.renderTasks.push(f);
            d = f.task;
            a.continueCallback && (n('render is used with continueCallback parameter'),
              d.onContinue = a.continueCallback);
            var g = this;
            e.displayReadyCapability.promise.then(function (a) {
              g.pendingCleanup ? b() : (c.time('Rendering'), f.initalizeGraphics(a), f.operatorListChanged())
            }, function (a) {
              b(a)
            });
            return d
          }, getOperatorList: function () {
            function a() {
              if (b.operatorList.lastChunk) {
                b.opListReadCapability.resolve(b.operatorList);
                var d = b.renderTasks.indexOf(c);
                0 <= d && b.renderTasks.splice(d, 1)
              }
            }

            this.intentStates.oplist || (this.intentStates.oplist = Object.create(null));
            var b = this.intentStates.oplist, c;
            b.opListReadCapability ||
            (c = {}, c.operatorListChanged = a, b.receivingOperatorList = !0, b.opListReadCapability = m(), b.renderTasks = [], b.renderTasks.push(c), b.operatorList = {
              fnArray: [],
              argsArray: [],
              lastChunk: !1
            }, this.transport.messageHandler.send('RenderPageRequest', {pageIndex: this.pageIndex, intent: 'oplist'}));
            return b.opListReadCapability.promise
          }, getTextContent: function (a) {
            return this.transport.messageHandler.sendWithPromise('GetTextContent', {
              pageIndex: this.pageNumber - 1,
              normalizeWhitespace: a && a.normalizeWhitespace || !1
            })
          }, _destroy: function () {
            this.destroyed =
              !0;
            this.transport.pageCache[ this.pageIndex ] = null;
            var a = [];
            Object.keys(this.intentStates).forEach(function (b) {
              'oplist' !== b && this.intentStates[ b ].renderTasks.forEach(function (b) {
                var c = b.capability.promise.catch(function () {
                });
                a.push(c);
                b.cancel()
              })
            }, this);
            this.objs.clear();
            this.annotationsPromise = null;
            this.pendingCleanup = !1;
            return Promise.all(a)
          }, destroy: function () {
            n('page destroy method, use cleanup() instead');
            this.cleanup()
          }, cleanup: function () {
            this.pendingCleanup = !0;
            this._tryCleanup()
          }, _tryCleanup: function () {
            this.pendingCleanup &&
            !Object.keys(this.intentStates).some(function (a) {
              a = this.intentStates[ a ];
              return 0 !== a.renderTasks.length || a.receivingOperatorList
            }, this) && (Object.keys(this.intentStates).forEach(function (a) {
              delete this.intentStates[ a ]
            }, this), this.objs.clear(), this.annotationsPromise = null, this.pendingCleanup = !1)
          }, _startRenderPage: function (a, b) {
            var c = this.intentStates[ b ];
            c.displayReadyCapability && c.displayReadyCapability.resolve(a)
          }, _renderPageChunk: function (a, b) {
            var c = this.intentStates[ b ], d, e;
            d = 0;
            for (e = a.length; d < e; d++) c.operatorList.fnArray.push(a.fnArray[ d ]),
              c.operatorList.argsArray.push(a.argsArray[ d ]);
            c.operatorList.lastChunk = a.lastChunk;
            for (d = 0; d < c.renderTasks.length; d++) c.renderTasks[ d ].operatorListChanged();
            a.lastChunk && (c.receivingOperatorList = !1, this._tryCleanup())
          }
        };
        return a
      }(), U = function () {
        function a() {
          if ('undefined' !== typeof aa) return aa;
          if (J('workerSrc')) return J('workerSrc');
          if (S) return S.replace(/\.js$/i, '.worker.js');
          t('No PDFJS.workerSrc specified')
        }

        function c() {
          h || (h = m(), (R || function (b) {
            D.loadScript(a(), function () {
              b(window.pdfjsDistBuildPdfWorker.WorkerMessageHandler)
            })
          })(h.resolve));
          return h.promise
        }

        function d(a) {
          return URL.createObjectURL(new Blob([ 'importScripts(\'' + a + '\');' ]))
        }

        function e(a) {
          this.name = a;
          this.destroyed = !1;
          this._readyCapability = m();
          this._messageHandler = this._webWorker = this._port = null;
          this._initialize()
        }

        var f = 0, h;
        e.prototype = {
          get promise() {
            return this._readyCapability.promise
          }, get port() {
            return this._port
          }, get messageHandler() {
            return this._messageHandler
          }, _initialize: function () {
            if (!Y && !J('disableWorker') && 'undefined' !== typeof Worker) {
              var b = a();
              try {
                g(window.location.href,
                  b) || (b = d((new URL(b, window.location)).href));
                var c = new Worker(b), e = new I('main', 'worker', c), f = function () {
                  c.removeEventListener('error', h);
                  e.destroy();
                  c.terminate();
                  this.destroyed ? this._readyCapability.reject(Error('Worker was destroyed')) : this._setupFakeWorker()
                }.bind(this), h = function (a) {
                  this._webWorker || f()
                }.bind(this);
                c.addEventListener('error', h);
                e.on('test', function (a) {
                  c.removeEventListener('error', h);
                  this.destroyed ? f() : a && a.supportTypedArray ? (this._messageHandler = e, this._webWorker = this._port =
                    c, a.supportTransfers || (L = !0), this._readyCapability.resolve(), e.send('configure', {verbosity: z()})) : (this._setupFakeWorker(), e.destroy(), c.terminate())
                }.bind(this));
                e.on('console_log', function (a) {
                  console.log.apply(console, a)
                });
                e.on('console_error', function (a) {
                  console.error.apply(console, a)
                });
                e.on('ready', function (a) {
                  c.removeEventListener('error', h);
                  if (this.destroyed) f(); else try {
                    l()
                  } catch (b) {
                    this._setupFakeWorker()
                  }
                }.bind(this));
                var l = function () {
                  var a = J('postMessageTransfers') && !L, a = new Uint8Array([ a ?
                    255 : 0 ]);
                  try {
                    e.send('test', a, [ a.buffer ])
                  } catch (b) {
                    k('Cannot use postMessage transfers'), a[ 0 ] = 0, e.send('test', a)
                  }
                };
                l();
                return
              } catch (m) {
                k('The worker has been disabled.')
              }
            }
            this._setupFakeWorker()
          }, _setupFakeWorker: function () {
            Y || J('disableWorker') || (b('Setting up fake worker.'), Y = !0);
            c().then(function (a) {
              if (this.destroyed) this._readyCapability.reject(Error('Worker was destroyed')); else {
                var b = {
                  _listeners: [], postMessage: function (a) {
                    var b = {data: a};
                    this._listeners.forEach(function (a) {
                      a.call(this, b)
                    }, this)
                  },
                  addEventListener: function (a, b) {
                    this._listeners.push(b)
                  }, removeEventListener: function (a, b) {
                    var c = this._listeners.indexOf(b);
                    this._listeners.splice(c, 1)
                  }, terminate: function () {
                  }
                };
                this._port = b;
                var c = 'fake' + f++, d = new I(c + '_worker', c, b);
                a.setup(d, b);
                this._messageHandler = new I(c, c + '_worker', b);
                this._readyCapability.resolve()
              }
            }.bind(this))
          }, destroy: function () {
            this.destroyed = !0;
            this._webWorker && (this._webWorker.terminate(), this._webWorker = null);
            this._port = null;
            this._messageHandler && (this._messageHandler.destroy(),
              this._messageHandler = null)
          }
        };
        return e
      }(), P = function () {
        function c(a, b, d) {
          this.messageHandler = a;
          this.loadingTask = b;
          this.pdfDataRangeTransport = d;
          this.commonObjs = new da;
          this.fontLoader = new fa(b.docId);
          this.destroyed = !1;
          this.destroyCapability = null;
          this.pageCache = [];
          this.pagePromises = [];
          this.downloadInfoCapability = m();
          this.setupMessageHandler()
        }

        c.prototype = {
          destroy: function () {
            if (this.destroyCapability) return this.destroyCapability.promise;
            this.destroyed = !0;
            this.destroyCapability = m();
            var a = [];
            this.pageCache.forEach(function (b) {
              b &&
              a.push(b._destroy())
            });
            this.pageCache = [];
            this.pagePromises = [];
            var b = this, c = this.messageHandler.sendWithPromise('Terminate', null);
            a.push(c);
            Promise.all(a).then(function () {
              b.fontLoader.clear();
              b.pdfDataRangeTransport && (b.pdfDataRangeTransport.abort(), b.pdfDataRangeTransport = null);
              b.messageHandler && (b.messageHandler.destroy(), b.messageHandler = null);
              b.destroyCapability.resolve()
            }, this.destroyCapability.reject);
            return this.destroyCapability.promise
          }, setupMessageHandler: function () {
            function c(a) {
              d.send('UpdatePassword',
                a)
            }

            var d = this.messageHandler, e = this.pdfDataRangeTransport;
            e && (e.addRangeListener(function (a, b) {
              d.send('OnDataRange', {begin: a, chunk: b})
            }), e.addProgressListener(function (a) {
              d.send('OnDataProgress', {loaded: a})
            }), e.addProgressiveReadListener(function (a) {
              d.send('OnDataRange', {chunk: a})
            }), d.on('RequestDataRange', function (a) {
              e.requestDataRange(a.begin, a.end)
            }, this));
            d.on('GetDoc', function (a) {
                var b = a.pdfInfo;
                this.numPages = a.pdfInfo.numPages;
                a = this.loadingTask;
                this.pdfDocument = b = new T(b, this, a);
                a._capability.resolve(b)
              },
              this);
            d.on('NeedPassword', function (b) {
              var d = this.loadingTask;
              if (d.onPassword) return d.onPassword(c, A.NEED_PASSWORD);
              d._capability.reject(new a(b.message, b.code))
            }, this);
            d.on('IncorrectPassword', function (b) {
              var d = this.loadingTask;
              if (d.onPassword) return d.onPassword(c, A.INCORRECT_PASSWORD);
              d._capability.reject(new a(b.message, b.code))
            }, this);
            d.on('InvalidPDF', function (a) {
              this.loadingTask._capability.reject(new N(a.message))
            }, this);
            d.on('MissingPDF', function (a) {
                this.loadingTask._capability.reject(new E(a.message))
              },
              this);
            d.on('UnexpectedResponse', function (a) {
              this.loadingTask._capability.reject(new p(a.message, a.status))
            }, this);
            d.on('UnknownError', function (a) {
              this.loadingTask._capability.reject(new v(a.message, a.details))
            }, this);
            d.on('DataLoaded', function (a) {
              this.downloadInfoCapability.resolve(a)
            }, this);
            d.on('PDFManagerReady', function (a) {
              this.pdfDataRangeTransport && this.pdfDataRangeTransport.transportReady()
            }, this);
            d.on('StartRenderPage', function (a) {
              if (!this.destroyed) {
                var b = this.pageCache[ a.pageIndex ];
                b.stats.timeEnd('Page Request');
                b._startRenderPage(a.transparency, a.intent)
              }
            }, this);
            d.on('RenderPageChunk', function (a) {
              this.destroyed || this.pageCache[ a.pageIndex ]._renderPageChunk(a.operatorList, a.intent)
            }, this);
            d.on('commonobj', function (a) {
              if (!this.destroyed) {
                var c = a[ 0 ], d = a[ 1 ];
                if (!this.commonObjs.hasData(c)) switch (d) {
                  case 'Font':
                    a = a[ 2 ];
                    var e;
                    if ('error' in a) {
                      var f = a.error;
                      b('Error during font loading: ' + f);
                      this.commonObjs.resolve(c, f);
                      break
                    } else d = null, J('pdfBug') && w.FontInspector && w.FontInspector.enabled && (d = {
                      registerFont: function (a,
                                              b) {
                        w.FontInspector.fontAdded(a, b)
                      }
                    }), e = new Z(a, {
                      isEvalSuported: J('isEvalSupported'),
                      disableFontFace: J('disableFontFace'),
                      fontRegistry: d
                    });
                    this.fontLoader.bind([ e ], function (a) {
                      this.commonObjs.resolve(c, e)
                    }.bind(this));
                    break;
                  case 'FontPath':
                    this.commonObjs.resolve(c, a[ 2 ]);
                    break;
                  default:
                    f('Got unknown common object type ' + d)
                }
              }
            }, this);
            d.on('obj', function (a) {
              if (!this.destroyed) {
                var b = a[ 0 ], c = a[ 2 ], d = this.pageCache[ a[ 1 ] ];
                if (!d.objs.hasData(b)) switch (c) {
                  case 'JpegStream':
                    a = a[ 3 ];
                    f(b, a, d.objs);
                    break;
                  case 'Image':
                    a =
                      a[ 3 ];
                    d.objs.resolve(b, a);
                    a && 'data' in a && 8E6 < a.data.length && (d.cleanupAfterRender = !0);
                    break;
                  default:
                    t('Got unknown object type ' + c)
                }
              }
            }, this);
            d.on('DocProgress', function (a) {
              if (!this.destroyed) {
                var b = this.loadingTask;
                if (b.onProgress) b.onProgress({loaded: a.loaded, total: a.total})
              }
            }, this);
            d.on('PageError', function (a) {
              if (!this.destroyed) {
                var b = this.pageCache[ a.pageNum - 1 ].intentStates[ a.intent ];
                b.displayReadyCapability ? b.displayReadyCapability.reject(a.error) : t(a.error);
                if (b.operatorList) for (b.operatorList.lastChunk =
                                           !0, a = 0; a < b.renderTasks.length; a++) b.renderTasks[ a ].operatorListChanged()
              }
            }, this);
            d.on('UnsupportedFeature', function (a) {
              if (!this.destroyed) {
                a = a.featureId;
                var b = this.loadingTask;
                if (b.onUnsupportedFeature) b.onUnsupportedFeature(a);
                ea.notify(a)
              }
            }, this);
            d.on('JpegDecode', function (a) {
              if (this.destroyed) return Promise.reject('Worker was terminated');
              var b = a[ 0 ], c = a[ 1 ];
              return 3 !== c && 1 !== c ? Promise.reject(Error('Only 3 components or 1 component can be returned')) : new Promise(function (a, d) {
                var e = new Image;
                e.onload =
                  function () {
                    var b = e.width, d = e.height, f = b * d, g = 4 * f, f = new Uint8Array(f * c),
                      h = O(b, d).getContext('2d');
                    h.drawImage(e, 0, 0);
                    var h = h.getImageData(0, 0, b, d).data, k, l;
                    if (3 === c) for (l = k = 0; k < g; k += 4, l += 3) f[ l ] = h[ k ], f[ l + 1 ] = h[ k + 1 ], f[ l + 2 ] = h[ k + 2 ]; else if (1 === c) for (l = k = 0; k < g; k += 4, l++) f[ l ] = h[ k ];
                    a({data: f, width: b, height: d})
                  };
                e.onerror = function () {
                  d(Error('JpegDecode failed to load image'))
                };
                e.src = b
              })
            }, this)
          }, getData: function () {
            return this.messageHandler.sendWithPromise('GetData', null)
          }, getPage: function (a, b) {
            if (0 >= a || a > this.numPages ||
              (a | 0) !== a) return Promise.reject(Error('Invalid page request'));
            var c = a - 1;
            if (c in this.pagePromises) return this.pagePromises[ c ];
            var d = this.messageHandler.sendWithPromise('GetPage', {pageIndex: c}).then(function (a) {
              if (this.destroyed) throw Error('Transport destroyed');
              a = new W(c, a, this);
              return this.pageCache[ c ] = a
            }.bind(this));
            return this.pagePromises[ c ] = d
          }, getPageIndex: function (a) {
            return this.messageHandler.sendWithPromise('GetPageIndex', {ref: a})
          }, getAnnotations: function (a, b) {
            return this.messageHandler.sendWithPromise('GetAnnotations',
              {pageIndex: a, intent: b})
          }, getDestinations: function () {
            return this.messageHandler.sendWithPromise('GetDestinations', null)
          }, getDestination: function (a) {
            return this.messageHandler.sendWithPromise('GetDestination', {id: a})
          }, getPageLabels: function () {
            return this.messageHandler.sendWithPromise('GetPageLabels', null)
          }, getAttachments: function () {
            return this.messageHandler.sendWithPromise('GetAttachments', null)
          }, getJavaScript: function () {
            return this.messageHandler.sendWithPromise('GetJavaScript', null)
          }, getOutline: function () {
            return this.messageHandler.sendWithPromise('GetOutline',
              null)
          }, getMetadata: function () {
            return this.messageHandler.sendWithPromise('GetMetadata', null).then(function (a) {
              return {info: a[ 0 ], metadata: a[ 1 ] ? new M(a[ 1 ]) : null}
            })
          }, getStats: function () {
            return this.messageHandler.sendWithPromise('GetStats', null)
          }, startCleanup: function () {
            this.messageHandler.sendWithPromise('Cleanup', null).then(function () {
              for (var a = 0, b = this.pageCache.length; a < b; a++) {
                var c = this.pageCache[ a ];
                c && c.cleanup()
              }
              this.commonObjs.clear();
              this.fontLoader.clear()
            }.bind(this))
          }
        };
        return c
      }(), da = function () {
        function a() {
          this.objs =
            Object.create(null)
        }

        a.prototype = {
          ensureObj: function (a) {
            if (this.objs[ a ]) return this.objs[ a ];
            var b = {capability: m(), data: null, resolved: !1};
            return this.objs[ a ] = b
          }, get: function (a, b) {
            if (b) return this.ensureObj(a).capability.promise.then(b), null;
            var c = this.objs[ a ];
            c && c.resolved || t('Requesting object that isn\'t resolved yet ' + a);
            return c.data
          }, resolve: function (a, b) {
            var c = this.ensureObj(a);
            c.resolved = !0;
            c.data = b;
            c.capability.resolve(b)
          }, isResolved: function (a) {
            var b = this.objs;
            return b[ a ] ? b[ a ].resolved : !1
          },
          hasData: function (a) {
            return this.isResolved(a)
          }, getData: function (a) {
            var b = this.objs;
            return b[ a ] && b[ a ].resolved ? b[ a ].data : null
          }, clear: function () {
            this.objs = Object.create(null)
          }
        };
        return a
      }(), ga = function () {
        function a(b) {
          this._internalRenderTask = b;
          this.onContinue = null
        }

        a.prototype = {
          get promise() {
            return this._internalRenderTask.capability.promise
          }, cancel: function () {
            this._internalRenderTask.cancel()
          }, then: function (a, b) {
            return this.promise.then.apply(this.promise, arguments)
          }
        };
        return a
      }(), ha = function () {
        function a(b,
                   c, d, e, f, g) {
          this.callback = b;
          this.params = c;
          this.objs = d;
          this.commonObjs = e;
          this.operatorListIdx = null;
          this.operatorList = f;
          this.pageNumber = g;
          this.running = !1;
          this.graphicsReadyCallback = null;
          this.cancelled = this.useRequestAnimationFrame = this.graphicsReady = !1;
          this.capability = m();
          this.task = new ga(this);
          this._continueBound = this._continue.bind(this);
          this._scheduleNextBound = this._scheduleNext.bind(this);
          this._nextBound = this._next.bind(this)
        }

        a.prototype = {
          initalizeGraphics: function (a) {
            if (!this.cancelled) {
              J('pdfBug') &&
              w.StepperManager && w.StepperManager.enabled && (this.stepper = w.StepperManager.create(this.pageNumber - 1), this.stepper.init(this.operatorList), this.stepper.nextBreakPoint = this.stepper.getNextBreakPoint());
              var b = this.params;
              this.gfx = new H(b.canvasContext, this.commonObjs, this.objs, b.imageLayer);
              this.gfx.beginDrawing(b.transform, b.viewport, a);
              this.operatorListIdx = 0;
              this.graphicsReady = !0;
              this.graphicsReadyCallback && this.graphicsReadyCallback()
            }
          }, cancel: function () {
            this.running = !1;
            this.cancelled = !0;
            this.callback('cancelled')
          },
          operatorListChanged: function () {
            this.graphicsReady ? (this.stepper && this.stepper.updateOperatorList(this.operatorList), this.running || this._continue()) : this.graphicsReadyCallback || (this.graphicsReadyCallback = this._continueBound)
          }, _continue: function () {
            this.running = !0;
            this.cancelled || (this.task.onContinue ? this.task.onContinue.call(this.task, this._scheduleNextBound) : this._scheduleNext())
          }, _scheduleNext: function () {
            this.useRequestAnimationFrame && 'undefined' !== typeof window ? window.requestAnimationFrame(this._nextBound) :
              Promise.resolve(void 0).then(this._nextBound)
          }, _next: function () {
            this.cancelled || (this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList, this.operatorListIdx, this._continueBound, this.stepper), this.operatorListIdx === this.operatorList.argsArray.length && (this.running = !1, this.operatorList.lastChunk && (this.gfx.endDrawing(), this.callback())))
          }
        };
        return a
      }(), ea = function () {
        var a = [];
        return {
          listen: function (b) {
            n('Global UnsupportedManager.listen is used:  use PDFDocumentLoadingTask.onUnsupportedFeature instead');
            a.push(b)
          }, notify: function (b) {
            for (var c = 0, d = a.length; c < d; c++) a[ c ](b)
          }
        }
      }();
      c.version = '1.5.188';
      c.build = '0e2d50f';
      c.getDocument = function (a, b, c, d) {
        var e = new ba;
        1 < arguments.length && n('getDocument is called with pdfDataRangeTransport, passwordCallback or progressCallback argument');
        b && (b instanceof X || (b = Object.create(b), b.length = a.length, b.initialData = a.initialData, b.abort || (b.abort = function () {
        })), a = Object.create(a), a.range = b);
        e.onPassword = c || null;
        e.onProgress = d || null;
        var f;
        'string' === typeof a ? f = {url: a} :
          r(a) ? f = {data: a} : a instanceof X ? f = {range: a} : ('object' !== typeof a && t('Invalid parameter in getDocument, need either Uint8Array, string or a parameter object'), a.url || a.data || a.range || t('Invalid parameter object: need either .data, .range or .url'), f = a);
        var g = {}, k = null, l = null, m;
        for (m in f) if ('url' === m && 'undefined' !== typeof window) g[ m ] = (new URL(f[ m ], window.location)).href; else if ('range' === m) k = f[ m ]; else if ('worker' === m) l = f[ m ]; else if ('data' !== m || f[ m ] instanceof Uint8Array) g[ m ] = f[ m ]; else {
          var p = f[ m ];
          'string' ===
          typeof p ? g[ m ] = h(p) : 'object' !== typeof p || null === p || isNaN(p.length) ? r(p) ? g[ m ] = new Uint8Array(p) : t('Invalid PDF binary data: either typed array, string or array-like object is expected in the data property.') : g[ m ] = new Uint8Array(p)
        }
        g.rangeChunkSize = g.rangeChunkSize || 65536;
        l || (l = new U, e._worker = l);
        var u = e.docId;
        l.promise.then(function () {
          if (e.destroyed) throw Error('Loading aborted');
          return K(l, g, k, u).then(function (a) {
            if (e.destroyed) throw Error('Loading aborted');
            a = new I(u, a, l.port);
            var b = new P(a, e, k);
            e._transport = b;
            a.send('Ready', null)
          })
        }).catch(e._capability.reject);
        return e
      };
      c.PDFDataRangeTransport = X;
      c.PDFWorker = U;
      c.PDFDocumentProxy = T;
      c.PDFPageProxy = W;
      c._UnsupportedManager = ea
    });
    (function (c, e) {
      e(c.pdfjsDisplayGlobal = {}, c.pdfjsSharedUtil, c.pdfjsDisplayDOMUtils, c.pdfjsDisplayAPI, c.pdfjsDisplayAnnotationLayer, c.pdfjsDisplayTextLayer, c.pdfjsDisplayMetadata, c.pdfjsDisplaySVG)
    })(this, function (c, e, u, y, B, l, C, K) {
      var N = e.globalScope, I = e.deprecated, E = e.warn, d = u.LinkTarget, A = 'undefined' === typeof window;
      N.PDFJS || (N.PDFJS = {});
      var a = N.PDFJS;
      a.version = '1.5.188';
      a.build = '0e2d50f';
      a.pdfBug = !1;
      void 0 !== a.verbosity && e.setVerbosityLevel(a.verbosity);
      delete a.verbosity;
      Object.defineProperty(a, 'verbosity', {
        get: function () {
          return e.getVerbosityLevel()
        }, set: function (a) {
          e.setVerbosityLevel(a)
        }, enumerable: !0, configurable: !0
      });
      a.VERBOSITY_LEVELS = e.VERBOSITY_LEVELS;
      a.OPS = e.OPS;
      a.UNSUPPORTED_FEATURES = e.UNSUPPORTED_FEATURES;
      a.isValidUrl = e.isValidUrl;
      a.shadow = e.shadow;
      a.createBlob = e.createBlob;
      a.createObjectURL = function (c,
                                    d) {
        return e.createObjectURL(c, d, a.disableCreateObjectURL)
      };
      Object.defineProperty(a, 'isLittleEndian', {
        configurable: !0, get: function () {
          var c = e.isLittleEndian();
          return e.shadow(a, 'isLittleEndian', c)
        }
      });
      a.removeNullCharacters = e.removeNullCharacters;
      a.PasswordResponses = e.PasswordResponses;
      a.PasswordException = e.PasswordException;
      a.UnknownErrorException = e.UnknownErrorException;
      a.InvalidPDFException = e.InvalidPDFException;
      a.MissingPDFException = e.MissingPDFException;
      a.UnexpectedResponseException = e.UnexpectedResponseException;
      a.Util = e.Util;
      a.PageViewport = e.PageViewport;
      a.createPromiseCapability = e.createPromiseCapability;
      a.maxImageSize = void 0 === a.maxImageSize ? -1 : a.maxImageSize;
      a.cMapUrl = void 0 === a.cMapUrl ? null : a.cMapUrl;
      a.cMapPacked = void 0 === a.cMapPacked ? !1 : a.cMapPacked;
      a.disableFontFace = void 0 === a.disableFontFace ? !1 : a.disableFontFace;
      a.imageResourcesPath = void 0 === a.imageResourcesPath ? '' : a.imageResourcesPath;
      a.disableWorker = void 0 === a.disableWorker ? !1 : a.disableWorker;
      a.workerSrc = void 0 === a.workerSrc ? null : a.workerSrc;
      a.disableRange =
        void 0 === a.disableRange ? !1 : a.disableRange;
      a.disableStream = void 0 === a.disableStream ? !1 : a.disableStream;
      a.disableAutoFetch = void 0 === a.disableAutoFetch ? !1 : a.disableAutoFetch;
      a.pdfBug = void 0 === a.pdfBug ? !1 : a.pdfBug;
      a.postMessageTransfers = void 0 === a.postMessageTransfers ? !0 : a.postMessageTransfers;
      a.disableCreateObjectURL = void 0 === a.disableCreateObjectURL ? !1 : a.disableCreateObjectURL;
      a.disableWebGL = void 0 === a.disableWebGL ? !0 : a.disableWebGL;
      a.externalLinkTarget = void 0 === a.externalLinkTarget ? d.NONE : a.externalLinkTarget;
      a.externalLinkRel = void 0 === a.externalLinkRel ? 'noreferrer' : a.externalLinkRel;
      a.isEvalSupported = void 0 === a.isEvalSupported ? !0 : a.isEvalSupported;
      var x = a.openExternalLinksInNewWindow;
      delete a.openExternalLinksInNewWindow;
      Object.defineProperty(a, 'openExternalLinksInNewWindow', {
        get: function () {
          return a.externalLinkTarget === d.BLANK
        }, set: function (c) {
          c && I('PDFJS.openExternalLinksInNewWindow, please use "PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK" instead.');
          a.externalLinkTarget !== d.NONE ? E('PDFJS.externalLinkTarget is already initialized') :
            a.externalLinkTarget = c ? d.BLANK : d.NONE
        }, enumerable: !0, configurable: !0
      });
      x && (a.openExternalLinksInNewWindow = x);
      a.getDocument = y.getDocument;
      a.PDFDataRangeTransport = y.PDFDataRangeTransport;
      a.PDFWorker = y.PDFWorker;
      Object.defineProperty(a, 'hasCanvasTypedArrays', {
        configurable: !0, get: function () {
          var c = u.hasCanvasTypedArrays();
          return e.shadow(a, 'hasCanvasTypedArrays', c)
        }
      });
      a.CustomStyle = u.CustomStyle;
      a.LinkTarget = d;
      a.addLinkAttributes = u.addLinkAttributes;
      a.getFilenameFromUrl = u.getFilenameFromUrl;
      a.isExternalLinkTargetSet =
        u.isExternalLinkTargetSet;
      a.AnnotationLayer = B.AnnotationLayer;
      a.renderTextLayer = l.renderTextLayer;
      a.Metadata = C.Metadata;
      a.SVGGraphics = K.SVGGraphics;
      a.UnsupportedManager = y._UnsupportedManager;
      c.globalScope = N;
      c.isWorker = A;
      c.PDFJS = N.PDFJS
    })
  }).call(K);
  B.PDFJS = K.pdfjsDisplayGlobal.PDFJS;
  B.build = K.pdfjsDisplayAPI.build;
  B.version = K.pdfjsDisplayAPI.version;
  B.getDocument = K.pdfjsDisplayAPI.getDocument;
  B.PDFDataRangeTransport = K.pdfjsDisplayAPI.PDFDataRangeTransport;
  B.PDFWorker = K.pdfjsDisplayAPI.PDFWorker;
  B.renderTextLayer =
    K.pdfjsDisplayTextLayer.renderTextLayer;
  B.AnnotationLayer = K.pdfjsDisplayAnnotationLayer.AnnotationLayer;
  B.CustomStyle = K.pdfjsDisplayDOMUtils.CustomStyle;
  B.PasswordResponses = K.pdfjsSharedUtil.PasswordResponses;
  B.InvalidPDFException = K.pdfjsSharedUtil.InvalidPDFException;
  B.MissingPDFException = K.pdfjsSharedUtil.MissingPDFException;
  B.SVGGraphics = K.pdfjsDisplaySVG.SVGGraphics;
  B.UnexpectedResponseException = K.pdfjsSharedUtil.UnexpectedResponseException;
  B.OPS = K.pdfjsSharedUtil.OPS;
  B.UNSUPPORTED_FEATURES = K.pdfjsSharedUtil.UNSUPPORTED_FEATURES;
  B.isValidUrl = K.pdfjsSharedUtil.isValidUrl;
  B.createObjectURL = K.pdfjsSharedUtil.createObjectURL;
  B.removeNullCharacters = K.pdfjsSharedUtil.removeNullCharacters;
  B.shadow = K.pdfjsSharedUtil.shadow;
  B.createBlob = K.pdfjsSharedUtil.createBlob;
  B.getFilenameFromUrl = K.pdfjsDisplayDOMUtils.getFilenameFromUrl;
  B.addLinkAttributes = K.pdfjsDisplayDOMUtils.addLinkAttributes
});
