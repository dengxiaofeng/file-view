var hasFocusOverride = function (element) {
  if (!element || !element.hasAttribute) {
    return false;
  }
  return element.hasAttribute('data-fv-allow-focus') || hasFocusOverride(element.parentElement);
};

var FocusManager = function ($el) {
  this.$container = $el;
  this._handler = this._focusHandler.bind(this);
};


FocusManager.prototype.trapFocus = function () {
  this._unfocusParentPage();
  document.addEventListener('focus', this._handler, true);
};


FocusManager.prototype.releaseFocus = function () {
  document.removeEventListener('focus', this._handler, true);
  this._restoreFocus();
};


FocusManager.prototype._focusHandler = function (event) {
  if (
    !hasFocusOverride(event.target) &&
    this.$container &&
    !this.$container[ 0 ].contains(event.target)
  ) {
    event.stopPropagation();
    document.activeElement.blur();
    this.$container.attr('tabindex', 1);
    this.$container.focus();
  }
};


FocusManager.prototype._unfocusParentPage = function () {
  this._originalActiveElement = document.activeElement;
  this._originalActiveElement && this._originalActiveElement.blur();
  this.$container.attr('tabindex', 1);
  this.$container.focus();
};

FocusManager.prototype._restoreFocus = function () {
  if (this._originalActiveElement) {
    this._originalActiveElement.focus();
  }
};

export default FocusManager
