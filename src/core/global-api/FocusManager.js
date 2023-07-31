import FocusManager from './FocusManagerImpl'
import NoopFocusManager from './NoopFocusManager'
const FocusManagerFactory = function ($el) {
  this.__element = $el;
};

FocusManagerFactory.prototype.create = function (embedded) {
  const ctor = embedded ? NoopFocusManager : FocusManager;
  return new ctor(this.__element);
};

export default FocusManagerFactory
