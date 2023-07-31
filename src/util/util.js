const updateHash = (pre, cur) => {
  return (prev << 5) + prev + curr;
}

const toCharCode = (str) => {
  return str.charCodeAt(0);
}

export const djb2 = (str) => {
  return str.split('').map(toCharCode).reduce(updateHash, 5381);
}


export const addQueryParamToUrl = (url, param) => {
  param = param || {};
  url = url.split('?');
  var queryArray = url[ 1 ] && url[ 1 ].split('&');
  queryArray = queryArray || [];
  Object.keys(param).forEach(function (key, val) {
    queryArray.push(key + '=' + param[ key ]);
  });
  if (queryArray.length === 0) {
    return url[ 0 ];
  }
  return url[ 0 ] + '?' + queryArray.join('&');
}

export const parseQueryString = (query) => {
  const parts = query.split('&');
  const params = {};
  for (let i = 0, ii = parts.length; i < ii; ++i) {
    const param = parts[ i ].split('=');
    const key = param[ 0 ].toLowerCase();
    const value = param.length > 1 ? param[ 1 ] : null;
    params[ decodeURIComponent(key) ] = decodeURIComponent(value);
  }
  return params;
}


export const noop = function () {

}
