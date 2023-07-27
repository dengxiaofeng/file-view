import $ from 'jquery'

var imageViewProvider = function () {
  return $.Deferred().resolve(require('../base/ImageView.js'))
}

export default imageViewProvider
