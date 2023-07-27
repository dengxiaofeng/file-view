//obj = { a: { b: { c: 'x' } } }
//getNestedProperty(obj, 'a.b.c') -> 'x'


var getNestedProperty = function (obj, prop) {
  var levels = prop.split('.');
  var i;
  for (i = 0; i < levels.length; i++) {
    obj = obj[ levels[ i ] ];
  }
  return obj;
}
function templateBackend(fileViewer) {
  return function (templateUrl) {
    return getNestedProperty(FileViewer.Templates, templateUrl)
  }
}
export default templateBackend
