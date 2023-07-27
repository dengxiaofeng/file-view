import $ from 'jquery'
import UnknownFileTypeView from '../component/UnknownFileTypeView'

var unknownFileTypeViewProvider = function () {
  return $.Deferred().resolve(UnknownFileTypeView);
}

export default unknownFileTypeViewProvider
