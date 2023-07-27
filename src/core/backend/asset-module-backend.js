function assetBacked(fileViewer) {
  return function (moduleName) {
    if (moduleName === 'pdf-config') {
      return fileViewer.getConfig.assets[ 'pdf-config' ] || {}
    }
  }
}

export default assetBacked
