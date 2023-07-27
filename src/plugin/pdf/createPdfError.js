var createPdfError = function (pdfjsErr, model) {
  var err = new Error(pdfjsErr.toString());
  var reason = pdfjsErr.message.split(':')[ 0 ];
  switch (reason) {
    case 'PasswordException':
      err.title = '哎哟！我们尚不能显示密码保护的文件。';
      err.description = '尝试下载该文件以便查看。';
      err.download = true;
      break;
    case 'InvalidPDFException':
      err.title = '哎哟！看上去这份文件已损坏。';
      err.description = '尝试下载该文件以便查看。';
      err.download = true;
      break;
    case 'MissingPDFException':
    case 'UnexpectedResponseException':
      err.title = '哎哟！我们不能加载PDF。';
      err.description = model.get('src');
      break;
    case 'UnknownErrorException':
    default:
      err.title = '哎哟！我们不能加载PDF';
      err.description = model.get('src');
      break;
  }
  err.icon = 'cp-pdf-icon';
  return err;
}

export default createPdfError
