import Backbone from 'backbone'
import file from './File'

var Files = Backbone.Collection.extend({
  model: file,

  getIndexWithCID: function (cid) {
    return this.indexOf(this.get({
      cid: cid
    }));
  }
});

export default Files
