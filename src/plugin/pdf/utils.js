export const approximateFraction = function roundToDivide(x) {
  // Fast paths for int numbers or their inversions.
  if (Math.floor(x) === x) {
    return [ x, 1 ];
  }
  var xinv = 1 / x;
  var limit = 8;
  if (xinv > limit) {
    return [ 1, limit ];
  } else if (Math.floor(xinv) === xinv) {
    return [ 1, xinv ];
  }

  var x_ = x > 1 ? xinv : x;
  // a/b and c/d are neighbours in Farey sequence.
  var a = 0, b = 1, c = 1, d = 1;
  // Limiting search to order 8.

  while (true) {
    // Generating next term in sequence (order of q).
    var p = a + c, q = b + d;
    if (q > limit) {
      break;
    }
    if (x_ <= p / q) {
      c = p;
      d = q;
    } else {
      a = p;
      b = q;
    }
  }

  // Select closest of the neighbours to x.
  if (x_ - a / b < c / d - x_) {
    return x_ === x ? [ a, b ] : [ b, a ];
  } else {
    return x_ === x ? [ c, d ] : [ d, c ];
  }
}

export const roundToDivide = function roundToDivide(x, div) {
  var r = x % div;
  return r === 0 ? x : Math.round(x - r + div);
};

export const getOutputScale = function getOutputScale(ctx) {
  var devicePixelRatio = window.devicePixelRatio || 1;
  var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
    ctx.mozBackingStorePixelRatio ||
    ctx.msBackingStorePixelRatio ||
    ctx.oBackingStorePixelRatio ||
    ctx.backingStorePixelRatio || 1;
  var pixelRatio = devicePixelRatio / backingStoreRatio;
  return {
    sx: pixelRatio,
    sy: pixelRatio,
    scaled: pixelRatio != 1
  };
};


