import Backbone from 'backbone'
import $ from 'jquery'
import { keys } from '../../constant/keyboard';
import { _templateStore } from '../store/template-store';

const pdfjsPasswordResponses = {
  NEED_PASSWORD: 1,
  INCORRECT_PASSWORD: 2
};

const fullscreenEvents = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange'
].join(' ');

const isFullscreen = function () {
  return (document.fullscreenElement ||
    document.mozFullScreen ||
    document.webkitIsFullScreen ||
    document.msFullscreenElement);
};

const PasswordLayer = Backbone.View.extend({

  className: 'cp-password-layer',

  events: {
    'keydown .cp-password-input': '_handleKeyDown',
    'click .cp-password-button': '_handleClick',
    'focus .cp-password-input': '_lockNavigation',
    'blur .cp-password-input': '_unlockNavigation'
  },

  initialize: function (options) {
    this._fileViewer = options.fileViewer;
    this.$el.hide();
  },

  teardown: function () {
    $(document).off(fullscreenEvents, this.updatePasswordLayer.bind(this));
  },

  /**
   * Show the password input layer
   * @param  {Number}   reason     Reason PDFJS why needs the password
   * @param  {Callback} updatePassword
   */
  showPasswordInput: function (reason, updatePassword) {
    $(document).on(fullscreenEvents, this.updatePasswordLayer.bind(this));
    this.updatePassword = updatePassword;
    this._fileViewer._view.fileContentView.getLayerForName('spinner').stopSpin();
    this.$el.show().html(_templateStore.get('passwordLayer')({
      prompt: this._getPromptTitle(reason)
    }));
    this.updatePasswordLayer();
    this._showToolbar();
  },

  hidePasswordInput: function () {
    $(document).off(fullscreenEvents, this.updatePasswordLayer.bind(this));
    this.$el.empty();
    this.$el.hide();
  },

  /**
   * Update the passwordLayer depending on fullsccren/no fullscreen
   * Safari/Firefox can't handle keyboard inputs in fullscreen
   */
  updatePasswordLayer: function () {
    if (isFullscreen()) {
      this.$el.find('.cp-password-base').hide();
      this.$el.find('.cp-password-fullscreen').show();
    } else {
      this.$el.find('.cp-password-fullscreen').hide();
      this.$el.find('.cp-password-base').show();
    }
  },

  /**
   * Get i18n string for password prompt based on reason
   * @param  {Number} reason Reason PDFJS why needs the password
   * @return {String}
   */
  _getPromptTitle: function (reason) {
    var title = '\u8f93\u5165\u5bc6\u7801\uff0c\u6253\u5f00\u6b64\u6587\u4ef6\uff1a';
    if (reason === pdfjsPasswordResponses.INCORRECT_PASSWORD) {
      title = '\u65e0\u6548\u5bc6\u7801\u3002\u8bf7\u91cd\u8bd5\u3002';
    }
    return title;
  },

  /**
   * Show passwordLayer and toolbar
   */
  _showToolbar: function () {
    var view = this._fileViewer._view;
    var toolbar = view.fileContentView.getLayerForName('toolbar');
    var mode = view._modes[ view._mode ];
    toolbar.setActions(mode.toolbarActions);
    toolbar.render();
  },

  /**
   * Check if password was given and call `updatePassword()`
   */
  _updatePassword: function () {
    var password = this.$el.find('.cp-password-input').val();
    if (password && password.length > 0) {
      this.hidePasswordInput();
      this.updatePassword(password);
    }
  },

  /**
   * Lock navigation keys
   */
  _lockNavigation: function () {
    this._fileViewer._view._navigationKeyLockCount++;
  },

  /**
   * Unlock navigation keys
   */
  _unlockNavigation: function () {
    this._fileViewer._view._navigationKeyLockCount--;
  },

  _handleClick: function (ev) {
    ev.preventDefault();
    this._updatePassword();
  },

  _handleKeyDown: function (ev) {
    if (ev.which === keys.RETURN) {
      ev.preventDefault();
      return this._updatePassword();
    }
    if (ev.which === keys.ESCAPE) {
      ev.preventDefault();
      return this._fileViewer.close();
    }
  }

});

export default PasswordLayer
