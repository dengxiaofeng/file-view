import $ from 'jquery'
import ImageView from '../base/ImageView'
var imageViewProvider = function () {
  return $.Deferred().resolve(ImageView)
}

export default imageViewProvider
