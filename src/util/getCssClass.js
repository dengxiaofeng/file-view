import fileTypes from './FileType'

export const getCssClass = function (type) {
  let iconClass = 'cp-unknown-file-type-icon';
  if (fileTypes.isImage(type)) {
    iconClass = 'cp-image-icon';
  } else if (fileTypes.isPDF(type)) {
    iconClass = 'cp-pdf-icon';
  } else if (fileTypes.isWordProcessing(type)) {
    iconClass = 'cp-document-icon';
  } else if (fileTypes.isSpreadsheet(type)) {
    iconClass = 'cp-spreadsheet-icon';
  } else if (fileTypes.isPresentation(type)) {
    iconClass = 'cp-presentation-icon';
  } else if (fileTypes.isText(type)) {
    iconClass = 'cp-text-icon';
  } else if (fileTypes.isCode(type)) {
    iconClass = 'cp-code-icon';
  } else if (fileTypes.isMultimedia(type)) {
    iconClass = 'cp-multimedia-icon';
  } else if (fileTypes.isArchive(type)) {
    iconClass = 'cp-archive-icon';
  }
  return iconClass;
}
