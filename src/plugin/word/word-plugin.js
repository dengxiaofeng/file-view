import BaseViewer from '../../core/component/BaseViewer'
import { _templateStore } from '../../core/store/template-store'
import $ from 'jquery';
import * as docx from "docx-preview";
const wordPlugin = BaseViewer.extend({
  id: 'cp-word-preview',
  initialize: function() {
    BaseViewer.prototype.initialize.apply(this, arguments);
  },
  setupMode: function (mode, isModeChanged) {
    // console.log("mode", mode)
  },
  // zoomFit: function() {
  //
  // },
  // zoomIn: function() {
  //   this.viewer.zoomIn()
  // },
  // zoomOut: function() {
  //   this.viewer.zoomOut()
  // },
  render() {
    this.$el.show().html(_templateStore.get('waitingMessage')({
      src: '',
      header: '您的预览即将出现!',
      message: '着急吗？您现在可以下载原件。'
    }));

    this.$el.html(`<div id="preview-word" style=" margin: 0px;padding: 0px;position: absolute;width: 100%;max-width: 80%;left: 50%;top: 0;transform: translateX(-50%);bottom: 0px;"></div>`);

    function getBinaryContent(path, options) {
      let promise, resolve, reject;
      let callback;

      if(!options) {
        options = {}
      }

      let createStandardXHR = function() {
        try {
          return new window.XMLHttpRequest();
        } catch (e) {}
      }

      let createActiveXHR = function() {
        try {
          return new window.ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {}
      }

      const createXHR = (typeof window !== "undefined" && window.ActiveXObject) ?
        function() {
          return createStandardXHR() || createActiveXHR();
        } :
        createStandardXHR;

      if(typeof options === "function") {
        callback = options;
        options = {}
      } else if(typeof options.callback === 'function') {
        callback = options.callback;
      }

      resolve = function (data) {
        callback(null, data);
      };

      reject = function (err) {
        callback(err, null);
      };

      try {
        const xhr = createXHR();
        xhr.open('GET', path, true);
        if('responseType' in xhr) {
          xhr.responseType = "arraybuffer"
        }


        xhr.onreadystatechange = function(event) {
          if(xhr.readyState === 4) {
            if(xhr.status === 200 || xhr.status === 0) {
              try {
                resolve(function(xhr){
                  return xhr.response || xhr.responseText
                }(xhr));
              } catch (err) {
                reject(new Error(err))
              }
            } else {
              reject(new Error("Ajax error for " + path + " : " + this.status + " " + this.statusText));
            }
          }
        }

        if(options.process) {
          xhr.onprogress = function(e) {
            options.progress({
              path: path,
              originalEvent: e,
              percent: e.loaded / e.total * 100,
              loaded: e.loaded,
              total: e.total
            });
          };
        }

        xhr.send();
      } catch (error) {
        reject(new Error(error), null)
      }

      return promise;

    }

    getBinaryContent(this._previewSrc, (error, data) => {
        if($('#cp-word-preview')) {
          docx.renderAsync(data, $("#cp-word-preview")[0]).then(res => console.log("res", res));
          this.trigger('viewerReady');

          console.log("docx", docx)
        }
    });

    return this;
  }
});

export default wordPlugin;
