import $ from 'jquery'
var InstanceManager = function (createFn, destroyFn) {
  this._createFn = createFn;
  this._destroyFn = destroyFn;
  this._instance = null;
  this._destroyDeferred = null;
};

InstanceManager.prototype.create = function () {
  var args = arguments;
  var d = new $.Deferred();
  var destroyPromise = (this._destroyDeferred && this._destroyDeferred.promise()) || $.when();

  destroyPromise.then(function () {
    this._destroyDeferred = new $.Deferred();
    this._instance = this._createFn.apply(this._createFn, args);
    d.resolve(this._instance);
  }.bind(this));

  return d.promise();
};

InstanceManager.prototype.destroy = function () {
  if (!this._destroyDeferred) {
    return;
  }
  this._destroyFn(this._instance);
  this._destroyDeferred.resolve();
};


export default InstanceManager
