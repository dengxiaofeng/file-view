var keys = {
  F: 70,
  G: 71,
  P: 80,
  RETURN: 13,
  ESCAPE: 27,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  PLUS: 187,
  MINUS: 189,
  PLUS_NUMPAD: 107,
  MINUS_NUMPAD: 109,
  PLUS_FF: 61,
  MINUS_FF: 173,
  SPACE: 32,
  ENTER: 13,
  TAB: 9
};

var createConditionalKeyHandler = function (fn) {
  return function (event) {
    var targetTagName = event.target.tagName && event.target.tagName.toUpperCase();
    if (targetTagName !== 'INPUT' && targetTagName !== 'TEXTAREA') {
      return fn.call(this, event);
    }
    if (event.which === keys.ESCAPE) {
      event.target.blur();
    }
  };
}


export {
  keys,
  createConditionalKeyHandler
};
