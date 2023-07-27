import Backbone from 'backbone'

var FileState = Backbone.Model.extend({
  defaults: {
    currentFileIndex: -1,
    isNewFileUploaded: false
  },

  setCollection: function (collection) {
    this.collection = collection;
  },

  setNext: function () {
    var currentFileIndex = this.get('currentFileIndex');
    if (currentFileIndex < (this.collection.length - 1)) {
      this.set({
        currentFileIndex: this.get('currentFileIndex') + 1
      });
    } else {
      this.set({
        currentFileIndex: 0
      });
    }
  },

  setPrev: function () {
    var currentFileIndex = this.get('currentFileIndex');
    if (currentFileIndex > 0) {
      this.set({
        currentFileIndex: this.get('currentFileIndex') - 1
      });
    } else {
      this.set({
        currentFileIndex: this.collection.length - 1
      });
    }
  },

  setNoCurrent: function () {
    this.set({
      currentFileIndex: -1
    });
  },

  setCurrentFileIndex: function (index) {
    if ((index > -1) && (index < this.collection.length)) {
      return this.set({
        currentFileIndex: index
      });
    }
  },

  setCurrentWithCID: function (cid) {
    return this.setCurrentFileIndex(this.collection.getIndexWithCID(cid));
  },

  getCurrent: function () {
    var current = this.collection.at(this.get('currentFileIndex'));
    return current || null;
  },

  selectWhere: function (selector) {
    if (selector) {
      var selected = this.collection.findWhere(selector);
      if (selected) {
        this.setCurrentWithCID(selected.cid);
      }
    } else if (this.collection.length >= 1) {
      this.setCurrentFileIndex(0);
    }
  },

  replaceCurrent: function (file) {
    var idx = this.get('currentFileIndex');
    this.collection.remove(this.collection.at(idx));
    this.collection.add(file, {
      at: idx
    });
  },

  setCurrentWithQuery: function (query) {
    var file = this.collection.findWhere(query);

    if (file) {
      this.setCurrentWithCID(file.cid);
    } else {
      this.setNoCurrent();
    }
  }
});

export default FileState
