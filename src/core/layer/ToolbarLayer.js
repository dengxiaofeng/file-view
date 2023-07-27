import Backbone from 'backbone'
import $ from 'jquery'
import _ from 'underscore'
import { keys } from '../../constant/keyboard';
import {_templateStore} from '../store/template-store';

var HIDE_CONTROLS_TIMEOUT = 500;


var THROTTLE_MOUSEMOVE = HIDE_CONTROLS_TIMEOUT - 100;


var HIDE_ANIMATION_DURATION = 400;
var SHOW_ANIMATION_DURATION = 100;


var ToolbarLayer = Backbone.View.extend({

  className: 'cp-toolbar-layer',

  initialize: function (options) {
    this._fileViewer = options.fileViewer;
    this._viewer = null;
    this._toggleControlsTimeout = null;
    this._actions = [];

    $('#cp-file-body').on('mousemove.toolbarLayer', this._showControlsOnMove.bind(
      this));
    $(document).on('keydown.tabToNavigate', this._tabToNavigate.bind(this));
  },

  teardown: function () {
    $(document).off('keydown.tabToNavigate');
    $('#cp-file-body').off('mousemove.toolbarLayer');
  },

  render: function () {
    debugger
    this.$el.html(_templateStore.get('toolbar')({
      actions: this._actions
    }));
    // this.$el.find('button').tooltip({
    //   gravity: 's',
    //   aria: true
    // });
    this.$toolbar = this.$('.cp-toolbar');

    var listeners = {};
    this._actions.forEach(function (action) {
      listeners['click .' + action.className] = action.handler;

      if (action.predicate && !action.predicate.call(this)) {
        this.$toolbar.find('.' + action.className).hide();
      }
    }, this);
    this.delegateEvents(listeners);

    this.$toolbar.css('margin-left', -this.$toolbar.width() / 2);

    this.$toolbar.on('click', 'a[href=\'#\']', function (e) {
      e.preventDefault();
    });

    return this;
  },

  setActions: function (actions) {
    this._actions = actions;
    this.render();
  },

  getActions: function () {
    return this._actions;
  },

  setViewer: function (viewer) {
    this._viewer = viewer;
    this.render();
  },

  _tabToNavigate: function (event) {
    if (event.which === keys.TAB) {
      this._showControlsOnMove.call(this);
    }
  },


  _showControlsOnMove: _.throttle(function () {
    if (!this.$toolbar) {
      return;
    }

    this.$toolbar.fadeTo(SHOW_ANIMATION_DURATION, 1);
    clearTimeout(this._toggleControlsTimeout);
    this._toggleControlsTimeout = this._setHideTimer();

  }, THROTTLE_MOUSEMOVE),

  _setHideTimer: function () {
    return setTimeout(function () {
      if (this.$toolbar.is(':hover')) {
        return;
      }
      if (this.$toolbar.has(':focus').length) {
        return;
      }

      this.$toolbar.find('button').each(this._removeTooltipForElement);

      this.$toolbar.fadeTo(HIDE_ANIMATION_DURATION, 0);
    }.bind(this), HIDE_CONTROLS_TIMEOUT);
  },

  _removeTooltipForElement: function (pos, el) {
    var tipsyId = $(el).attr('aria-describedby');
    if (tipsyId) {
      $('#' + tipsyId).fadeOut();
    }
  }

});

export default ToolbarLayer
