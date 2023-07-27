var videojs = window.videojs;
var ButtonPresentationMode = videojs.Button.extend({
  init: function (opts) {
    this._fileViewer = opts.fileViewer;
    this._player = opts.player;

    videojs.Button.call(this, this._player, {
      el: videojs.Component.prototype.createEl(null, {
        className: 'vjs-presentation-control vjs-control',
        innerHTML: [
          '<div class="vjs-control-content">',
          '<span class="vjs-control-text">',
          'Presentation Mode',
          '</span>',
          '</div>'
        ].join(''),
        role: 'button',
        tabindex: 0,
        'aria-live': 'polite'
      })
    });

    this.on('click', this.changeMode);
  }
});

ButtonPresentationMode.asPlugin = function (fileViewer) {
  return function (options) {
    var player = this;
    var button = new ButtonPresentationMode({
      player: player,
      fileViewer: fileViewer
    });

    button.options = options;

    player.ready(function () {
      player.controlBar.addChild(button);
    });
  };
};

ButtonPresentationMode.prototype.changeMode = function () {
  if (this._fileViewer.isInMode('PRESENTATION')) {
    this._fileViewer.changeMode('BASE');
  } else {
    this._fileViewer.changeMode('PRESENTATION');
  }
};

export default ButtonPresentationMode
