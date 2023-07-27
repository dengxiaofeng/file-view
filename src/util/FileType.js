var browserSupportedImageTypes = [ 'image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/web', 'image/bmp' ]

var browserSupportedMultimediaTypes = [ 'video/mp4', 'video/m4v', 'video/youtube', 'audio/mp3', 'audio/mpeg' ];

var toLowerType = function (type) {
  return type && type.toLowerCase() || '';
};


var fileTypes = {
  isPDF: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'application/pdf';
  },
  isText: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'text/plain';
  },
  isCode: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'text/java' || lowerType === 'text/css' || lowerType === 'text/html' || lowerType === 'text/javascript' || lowerType === 'text/xml';
  },
  isMultimedia: function (type) {
    var lowerType = toLowerType(type);
    return /^video\/.*/i.test(type) || /^audio\/.*/i.test(type) || lowerType === 'application/x-shockwave-flash' || lowerType === 'application/vnd.rn-realmedia' || lowerType === 'application/x-oleobject';
  },
  isArchive: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'application/zip' || lowerType === 'application/java-archive';
  },
  isImage: function (type) {
    return /^image\/.*/i.test(type);
  },
  isVideo: function (type) {
    var lowerType = toLowerType(type);
    return /^video\/.*/i.test(type) || lowerType === 'video';
  },
  isAudio: function (type) {
    var lowerType = toLowerType(type);
    return /^audio\/.*/i.test(type) || lowerType === 'audio';
  },
  isImageBrowserSupported: function (type) {
    debugger
    console.log(type)
    return browserSupportedImageTypes.indexOf(type.toLowerCase()) !== -1;
  },
  isMultimediaBrowserSupported: function (type) {
    return browserSupportedMultimediaTypes.indexOf(type.toLowerCase()) !== -1;
  },
  isWordProcessing: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'application/msword' || /^application\/vnd.ms-word.*/i.test(type) || /^application\/vnd.openxmlformats-officedocument.wordprocessingml.*/i.test(type);
  },
  isSpreadsheet: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'application/msexcel' || /^application\/vnd.ms-excel.*/i.test(type) || /^application\/vnd.openxmlformats-officedocument.spreadsheet.*/i.test(type);
  },
  isPresentation: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'application/mspowerpoint' || /^application\/vnd.ms-powerpoint.*/i.test(type) || /^application\/vnd.openxmlformats-officedocument.presentationml.*/i.test(type);
  },
  is3D: function (type) {
    var lowerType = toLowerType(type);
    return lowerType === 'application/x-sea';
  },
  matchAll: function () {
    return true;
  }
}

export default fileTypes
