import Backbone from 'backbone'
import { getCssClass } from '../../util/getCssClass';
import {_templateStore} from '../store/template-store';

const TitleView = Backbone.View.extend({

  initialize: function (options) {
    this._fileViewer = options.fileViewer;
  },

  render: function () {
    const model = this._fileViewer.getCurrentFile();
    if (!model) {
      return;
    }

    this.$el.html(_templateStore.get('titleContainer')({
      title: model.get('title'),
      iconClass: getCssClass(model.get('type'))
    }));

    return this;
  }
});

export default TitleView
