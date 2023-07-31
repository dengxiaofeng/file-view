//obj = { a: { b: { c: 'x' } } }
//getNestedProperty(obj, 'a.b.c') -> 'x'


const getNestedProperty = function (obj, prop) {
  const levels = prop.split('.');
  let i;
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
