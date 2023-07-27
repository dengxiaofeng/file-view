import {_templateStore} from '../../core/store/template-store';

import $ from 'jquery'
import videojs from 'video.js/dist/video.min'
// video.js

var ButtonToggleHd = videojs.Button.extend({
  init: function (opts) {
    this._fileViewer = opts.fileViewer;
    this._player = opts.player;
    this._isPlayingHd = opts.isPlayingHd;

    videojs.Button.call(this, this._player, {
      el: videojs.Component.prototype.createEl(null, {
        className: 'vjs-hd-control vjs-control',
        innerHTML: _templateStore.get('customControlBarItem')({
          descr: 'Toggle HD/SD Quality'
        }),
        role: 'button',
        tabindex: 0,
        'aria-live': 'polite'
      })
    });

    this.on('click', this.toggleSource);
  }
});

ButtonToggleHd.asPlugin = function (fileViewer) {
  return function (options) {
    if (!options.src_hd) {
      return;
    }

    var player = this;
    var button = new ButtonToggleHd({
      player: player,
      fileViewer: fileViewer,
      isPlayingHd: options.hd_active
    });

    button.options = options;

    player.ready(function () {
      $(this.el()).addClass('vjs-hd-source');
      if (options.hd_active) {
        $(this.el()).addClass('vjs-hd-playing');
      }
      player.controlBar.addChild(button);
    });
  };
};
ButtonToggleHd.prototype.fixPreload = function () {
  var player = this._player;
  if (player.el().firstChild.preload === 'none') {
    player.el().firstChild.preload = 'metadata';
  }
};

ButtonToggleHd.prototype.switchSource = function (options) {
  var player = this._player;
  var playerEl = $(player.el());
  var wasPaused = player.paused();
  var hasStarted = playerEl.hasClass('vjs-has-started');

  this.fixPreload();

  playerEl.find('source').remove();

  player.poster('');
  if (options.position) {

    $(player.tag).css('display', 'none');
  }
  player.src(options.src);
  player.ready(function () {
    player.one('loadedmetadata', function () {
      player.poster(options.poster);
      if (hasStarted) {
        playerEl.addClass('vjs-has-started');
      }
    }.bind(player));
    if (options.position) {
      player.one('loadeddata', function () {
        player.currentTime(options.position);
        if (wasPaused) {
          player.pause();
        } else {
          player.play();
        }
      });
    }

    player.one('seeked', function () {
      $(player.tag).css('display', 'block');
    });
  });
};

ButtonToggleHd.prototype.toggleSource = function () {
  var player = this._player;
  var playerEl = $(player.el());
  var options = {
    position: player.tech.currentTime(),
    src: '',
    poster: ''
  };

  if (this._isPlayingHd) {
    this._isPlayingHd = false;
    this._fileViewer.getStorage().setItem('videoQualityHd', false);
    options.src = this.options.src;
    options.poster = this.options.poster;
    playerEl.removeClass('vjs-hd-playing');
  } else {
    this._isPlayingHd = true;
    this._fileViewer.getStorage().setItem('videoQualityHd', true);
    options.src = this.options.src_hd;
    options.poster = this.options.poster_hd;
    playerEl.addClass('vjs-hd-playing');
  }
  this.switchSource(options);
};

export default ButtonToggleHd
