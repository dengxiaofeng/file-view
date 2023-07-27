import _ from 'underscore'
import Backbone from 'backbone'
import ConstantsDictionary from '../global-api/constants-dictionary'

var invoke = function (fn) {
  return fn();
};

var pick = function (property, obj) {
  return obj[ property ];
};

var pickBoundFn = function (property, obj) {
  return _.isFunction(obj[ property ]) && obj[ property ].bind(obj);
};


var FileContentLayerView = Backbone.View.extend({


  initialize: function (options) {
    this._layerViewsByName = new ConstantsDictionary();
    this._layerViewRegistrations = [];
    this._layers = null;
    this._fileViewer = options.fileViewer;
  },


  hasLayerView: function (name) {
    return this._layerViewsByName.isDefined(name);
  },


  addLayerView: function (name, LayerView, options) {


    options = _.extend({
      predicate: function () {
        return true;
      },
      weight: 0
    }, options);

    this._layerViewsByName.define(name, LayerView);
    this._layerViewRegistrations.push({
      LayerView: LayerView,
      name: name,
      predicate: options.predicate,
      weight: options.weight
    });
  },


  areLayersInitialized: function () {
    return this._layers !== null;
  },


  countInitializedLayers: function () {
    return (this._layers || []).length;
  },


  initializeLayers: function () {
    this.initializeLayerSubset(_.map(this._layerViewRegistrations, function (item) {
      return item.name;
    }));
  },


  initializeLayerSubset: function (names) {


    this._layers = this._layerViewRegistrations
      .filter(function (registration) {
        var isInSubset = (names.indexOf(registration.name) !== -1);
        return isInSubset && registration.predicate(this._fileViewer);
      }, this)
      .map(function (registration) {
        var view = new registration.LayerView({
          contentLayerView: this,
          fileViewer: this._fileViewer
        });
        return {
          view: view,
          name: registration.name,
          weight: registration.weight
        };
      }, this);

    this._layers = _.sortBy(this._layers, function (layer) {
      return layer.weight * -1;
    });

    this.trigger('initializeLayers');

    this.render();
  },


  teardownLayers: function () {
    if (this.areLayersInitialized()) {
      this._layers.map(_.partial(pick, 'view'))
        .map(_.partial(pickBoundFn, 'teardown'))
        .filter(_.isFunction)
        .forEach(invoke);

      this._layers.map(_.partial(pick, 'view'))
        .map(_.partial(pickBoundFn, 'remove'))
        .filter(_.isFunction)
        .forEach(invoke);

      this._layers = null;
    }

    this.trigger('teardownLayers');

    this.render();
  },


  reinitializeLayers: function () {
    this.teardownLayers();
    this.initializeLayers();
  },


  isLayerInitialized: function (name) {
    if (!this.areLayersInitialized()) {
      return false;
    }

    return _.find(this._layers, function (layer) {
      return layer.name === name;
    }) ? true : false;
  },

  getLayerForName: function (name) {


    var layer = _.find(this._layers, function (layer) {
      return layer.name === name;
    });



    return layer.view;
  },


  render: function () {
    this.$el.empty();

    if (this.areLayersInitialized()) {
      this._layers.map(_.partial(pick, 'view'))
        .map(_.partial(pickBoundFn, 'render'))
        .forEach(invoke);

      this._layers.map(_.partial(pick, 'view'))
        .map(_.partial(pick, '$el'))
        .forEach(function ($layer) {
          this.$el.append($layer);
        }, this);
    }

    this.trigger('renderLayers');

    return this;
  }

});

export default FileContentLayerView
