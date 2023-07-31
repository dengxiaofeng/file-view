import Backbone from 'backbone'
import file from './File'

const Files = Backbone.Collection.extend({
  model: file,

  getIndexWithCID: function (cid) {
    return this.indexOf(this.get({
      cid: cid
    }));
  }
});

export default Files
