import Backbone from 'backbone'

const File = Backbone.Model.extend({
  defaults: {
    src: '',
    type: '',
    thumbnail: '',
    poster: '',
    title: '',
    downloadable: true
  }
})


export default File
