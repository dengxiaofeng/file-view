function moduleBackend(fileViwer) {
  return function (moduleName) {
    if (moduleName) {
      console.log(fileViwer.getConfig().assets)
      return fileViwer.getConfig().assets[ 'pdf-config' ] || {}
    }
  }
}

export default moduleBackend
