import Backbone from 'backbone'
import ConstantsDictionary from '../global-api/constants-dictionary'

var PanelContainerView = Backbone.View.extend({

  className: 'panel-view',


  initialize: function (options) {
    this._panelViewsByName = new ConstantsDictionary();
    this._currentPanel = null;
    this._currentPanelName = null;
    this._lastAddedPanelName = null;
    this._fileViewer = options.fileViewer;
  },


  hasPanelView: function (name) {
    return this._panelViewsByName.isDefined(name);
  },


  addPanelView: function (name, PanelView) {
    this._panelViewsByName.define(name, PanelView);
    this._lastAddedPanelName = name;
  },


  isAnyPanelInitialized: function () {
    return this.$el.is('.expanded');
  },


  isPanelInitialized: function (name) {
    return this._currentPanelName === name;
  },


  initializePanel: function (name) {
    name = name || this._lastAddedPanelName;


    var PanelView = this._panelViewsByName.lookup(name);

    this._currentPanelName = name;
    this._currentPanel = new PanelView({
      collection: this.collection,
      fileViewer: this._fileViewer,
      panelView: this
    });

    this.$el.toggleClass('expanded', true);

    this.trigger('initializePanel', this._currentPanelName);
    this.trigger('togglePanel', this._currentPanelName, true);

    this.render();
  },


  teardownPanel: function () {
    if (this._currentPanel) {
      if (this._currentPanel.teardown) {
        this._currentPanel.teardown();
      }
      this._currentPanel.remove();
    }

    this.$el.toggleClass('expanded', false);

    this.trigger('togglePanel', this._currentPanelName, false);
    this.trigger('teardownPanel', this._currentPanelName);

    this._currentPanelName = null;
    this._currentPanel = null;

    this.render();
  },


  reinitializePanel: function () {
    if (!this.isAnyPanelInitialized()) {
      return;
    }

    var previousPanel = this.getInitializedPanelName();
    this.teardownPanel();
    this.initializePanel(previousPanel);
  },

  getInitializedPanelName: function () {
    return this._currentPanelName;
  },

  getInitializedPanel: function () {
    return this._currentPanel;
  },

  render: function () {
    this.$el.empty();

    if (this.isAnyPanelInitialized()) {
      this._currentPanel.render();
      this._currentPanel.$el.appendTo(this.$el);
    }
    this.trigger('renderPanel', this._currentPanelName);

    return this;
  }

});

export default PanelContainerView

