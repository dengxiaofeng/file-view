import Backbone from 'backbone'
import {_templateStore} from '../store/template-store';

var ErrorLayer = Backbone.View.extend({
  className: 'cp-error-layer',
  initialize: function () {
    this.$el.hide();
  },
  showErrorMessage: function (err, file) {
    var title, description, icon, srcDownload, srcBrowser;
    title = err.title || '不能预览此文件';
    description = err.description || err.toString();
    icon = err.icon || false;
    srcBrowser = err.browser ? file.get('src') : false;
    srcDownload = err.download ? file.get('srcDownload') || file.get('src') : false;
    this.$el.show().html(_templateStore.get('displayError')({
      title: title,
      message: description,
      icon: icon,
      srcBrowser: srcBrowser,
      srcDownload: srcDownload
    }));
  }
})

export default ErrorLayer
