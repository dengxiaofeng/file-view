import File from '../component/File'


var rejectWithError = function (msg) {
  return new $.Deferred().reject(
    new Error(msg)
  ).promise();
};

var Commands = {};

Commands.LookupViewer = function (originalFile, viewerRegistry) {
  this._originalFile = originalFile;
  this._viewerRegistry = viewerRegistry;
};

Commands.LookupViewer.prototype.execute = function (previewSrc, previewType, overwrites) {
  var convertedFile = new File(this._originalFile.toJSON());

  convertedFile.set(overwrites);

  convertedFile.set('type', previewType);
  convertedFile.set('src', previewSrc);

  var loadViewer = this._viewerRegistry.get(previewType);

  if (!loadViewer) {
    return rejectWithError(
      '\u6b64\u6587\u4ef6\u7c7b\u578b\u6ca1\u6709\u67e5\u770b\u4eba\u3002');
  }
  const dfd = $.Deferred();
  loadViewer().then(function (Viewer) {
    dfd.resolve(Viewer, previewSrc, convertedFile);
  }).fail(function () {
    dfd.fail(arguments);
  });

  return dfd.promise();
};

export default Commands
