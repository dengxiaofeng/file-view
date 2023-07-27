function TemplateStore() {
  this._backend = null;
};

TemplateStore.prototype.validBackend = function (backend) {
  return _.isFunction(backend);
};

TemplateStore.prototype.get = function (templateUrl) {
  return this._backend && this._backend(templateUrl);
};

TemplateStore.prototype.useBackend = function (backend) {
  this._backend = backend;
};




export const _templateStore =  new TemplateStore()
