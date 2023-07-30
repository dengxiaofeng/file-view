import FileViewer from "../../src";
window.FileViewer = FileViewer

//
// var selectors = {
//   image: [ 'a[file-preview-type=image]' ]
// };
//
// const getImageSelector = function () {
//   return selectors.image.join(', ')
// }
//
// const imageSelector = getImageSelector()
//
// const getPreviewableFileSelector = function () {
//   return Object.keys(selectors).map(function (k) {
//     return selectors[ k ].join(', ')
//   }).filter(Boolean).join(', ')
// }
//
// function getDownloadUrl($fileElement) {
//   return $fileElement.data('download-url') || $fileElement.attr('href')
// }
//
//
// var $files = $(getPreviewableFileSelector());
// var files = []
// $files.each(function(){
//   var $el = $(this).closest('a')
//
//   if($el.is(imageSelector)){
//      files.push({
//        type:$el.attr('file-preview-application'),
//        id:$el.attr('file-preview-id'),
//        src: getDownloadUrl($el),
//        title:$el.attr('file-preview-title'),
//        thumbnail: $el.attr('file-preview-url') || $el.attr('data-download-url') || $el.find('img').attr('src')
//      })
//   }
// })

var viewer = new FileViewer({
    enableMiniMode: true,
    viewers:['image']
});
// console.log("files", files)
// viewer.updateFiles(files);
//
// $('a').click(function(event){
//   console.log($(this).attr('file-preview-id'))
//   event.preventDefault()
//   debugger
//   viewer.open({
//     id: $(this).attr('file-preview-id')
//   });
// })
