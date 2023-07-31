import $ from 'jquery'
import ImageView from '../base/ImageView'
const imageViewProvider = function () {
  return $.Deferred().resolve(ImageView)
}

export default imageViewProvider
