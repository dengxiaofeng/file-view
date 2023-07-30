import { pdfProperty } from './pdf-properties'

function Cache(size) {
  let data = []
  this.push = function cachePush(view) {
    const i = data.indexOf(view);
    if (i >= 0) {
      data.splice(i, 1);
    }
    data.push(view);
    if (data.length > size) {
      data.shift().destroy();
    }
  }

  this.resize = function (newSize) {
    size = newSize;
    while (data.length > size) {
      data.shift().destroy();
    }
  }
}


export const cache = new Cache(pdfProperty.DEFAULT_CACHE_SIZE)
