import $ from 'jquery'
import _ from 'underscore'

var ModuleStore = function () {
  this._backend = null;
};

ModuleStore.validBackend = function (backend) {
  return _.isFunction(backend);
}

ModuleStore.prototype.get = function (modulePath) {
  return $.when(this._backend(modulePath));
};

ModuleStore.prototype.useBackend = function (backend) {
  this._backend = backend;
};

export const  moduleStore= new ModuleStore()
