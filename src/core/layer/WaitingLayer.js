import Backbone from 'backbone'
import {_templateStore} from '../store/template-store';

var WaitingLayer = Backbone.View.extend({

  className: 'cp-waiting-layer',

  initialize: function () {
    this.$el.hide();
  },

  showMessage: function (file, header, message) {
    this.$el.show().html(_templateStore.get('waitingMessage')({
      src: file.get('srcDownload') || file.get('src'),
      header: header,
      message: message
    }));
    // this.$el.find('.cp-waiting-message-spinner').spin('large', {
    //   color: '#fff',
    //   zIndex: 'auto'
    // });
  },

  clearMessage: function () {
    // this.$el.find('.cp-waiting-message-spinner').spin(false);
    this.$el.hide();
  }

});

export default WaitingLayer
