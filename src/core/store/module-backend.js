function moduleBackend(fileViwer) {
  return function (moduleName) {
    if (moduleName) {
      return fileViwer.getConfig().assets[ 'pdf-config' ] || {}
    }
  }
}

export default moduleBackend
