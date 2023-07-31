import $ from 'jquery'
import UnknownFileTypeView from '../component/UnknownFileTypeView'

const unknownFileTypeViewProvider = function () {
  return $.Deferred().resolve(UnknownFileTypeView);
}

export default unknownFileTypeViewProvider
