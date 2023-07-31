import _ from 'underscore'

const createMatchFn = function (expected) {
  return function (current) {
    return current === expected;
  };
};


const ViewerRegistry = function () {
  this._handlers = [];
};


ViewerRegistry.isValidPreviewer = function (previewer) {
  return _.isFunction(previewer);
};


ViewerRegistry.isValidWeight = function (weight) {
  return typeof weight === 'number' && !isNaN(weight);
};


ViewerRegistry.prototype.register = function (fileType, previewer, weight) {
  const matchesFileType = typeof fileType === 'function' ? fileType : createMatchFn(fileType);
  weight = weight || 10;

  this._handlers.push({
    matchesFileType: matchesFileType,
    previewer: previewer,
    weight: weight
  });

  this._updateWeighting();
};


ViewerRegistry.prototype.get = function (fileType) {
  const handler = _.find(this._handlers, function (handler) {
    return handler.matchesFileType(fileType);
  });

  return handler && handler.previewer;
};

ViewerRegistry.prototype._updateWeighting = function () {
  this._handlers = _.sortBy(this._handlers, function (handler) {
    return handler.weight;
  });
};


export default ViewerRegistry
