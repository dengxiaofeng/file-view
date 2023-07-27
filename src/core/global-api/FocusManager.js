import FocusManager from './FocusManagerImpl'
import NoopFocusManager from './NoopFocusManager'
var FocusManagerFactory = function ($el) {
  this.__element = $el;
};

FocusManagerFactory.prototype.create = function (embedded) {
  var ctor = embedded ? NoopFocusManager : FocusManager;
  return new ctor(this.__element);
};

export default FocusManagerFactory
