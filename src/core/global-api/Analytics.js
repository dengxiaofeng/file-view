import _ from 'underscore'

var Analytics = function (backend, fileViewer, hasher) {
  this._backend = backend;
  this._fileViewer = fileViewer;
  this._hasher = hasher;
};


Analytics.prototype.send = function (key, data) {
  if (!this._backend) {
    return;
  }
  var file = this._fileViewer.getCurrentFile();
  var attributes = (file && file.attributes) || {};
  var augmentedData = _.extend({
    fileType: attributes.type,
    fileId: this._hasher(attributes.src || ''),
    fileState: this._fileViewer.getView().getViewState()
  }, data);
  this._backend(key, augmentedData);
};


Analytics.prototype.fn = function (key, data) {
  return this.send.bind(this, key, data);
}

export default Analytics
