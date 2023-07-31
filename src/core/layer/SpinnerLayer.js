import Backbone from 'backbone'
import {_templateStore} from '../store/template-store';

const SPINNER_SIZE = 'large';
const SPINNER_STYLE = {
  color: '#fff',
  zIndex: 'auto'
};


const SpinnerLayer = Backbone.View.extend({

  className: 'cp-spinner-layer',

  initialize: function () {
    this._updateElements();
  },

  render: function () {
    this.$el.html(_templateStore.get('fileBodySpinner')());
    this._updateElements();
    return this;
  },

  startSpin: function () {
   // this.$spinner.spin(SPINNER_SIZE, SPINNER_STYLE);
  },

  stopSpin: function () {
   // this.$spinner.spin(false);
  },

  _updateElements: function () {
    //this.$spinner = this.$el.find('.cp-spinner');
  }

});


export default SpinnerLayer
