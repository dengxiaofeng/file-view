var noop = function () {};

var NoopFocusManager = function ($el) {};

NoopFocusManager.prototype.trapFocus = noop;

NoopFocusManager.prototype.releaseFocus = noop;


export default NoopFocusManager
