import InstanceManager from '../../core/global-api/InstanceManager'
import BaseViewer from '../../core/component/BaseViewer'
import fileTypes from '../../util/FileType';
import _ from 'underscore'
import { _templateStore } from '../../core/store/template-store';
import PluginProgressTooltips from './PluginProgressTooltips'
// import ButtonPresentationMode from './ButtonPresentationMode'
// import ButtonToggleHd from './ButtonToggleHd'
import videojs from 'video.js/dist/video.min'

import { keys, createConditionalKeyHandler } from '../../constant/keyboard';
import $ from 'jquery'
import './media.css'
// import 'video.js/dist/video-js.min.css'
window.HELP_IMPROVE_VIDEOJS = false;
const  videoInstance = videojs
window.videojs = videoInstance
const playerManager = new InstanceManager(videoInstance, function (player) {
 // player.tech() && player.pause()
  player.dispose()
})


const VideoView = BaseViewer.extend({

  id: 'cp-video-preview',

  playerId: 'cp-video-player',

  events: {
    'click .vjs-poster': 'togglePlay'
  },

  initialize: function () {
    BaseViewer.prototype.initialize.apply(this, arguments);
    var type = this.model.get('type');

    this._paddingVertical = 20;
    this._paddingScrollbar = 40;
    this._paddingNavArrows = 160;

    this._isPaused = true;
    this._isVideo = fileTypes.isVideo(type);
    this._isAudio = fileTypes.isAudio(type);
    // this._isYoutube   = fileTypes.isYoutube(type);
    this._isAutoPlay = this._fileViewer.get('videoViewerAutoplay');
    this._maxWidth = this._isVideo ? 1280 : 640;
    this._maxHeight = this._isVideo ? 720 : 640;
    this._minWidth = this._isVideo ? 160 : 120;
    this._minHeight = this._isVideo ? 90 : 120;
    this._hasHdSource = this.model.get('src_hd') ? true : false;

    $(window).on(
      'resize.videojs',
      _.throttle(this._handleResize.bind(this), 50)
    );
    $(document).on(
      'keydown.videoView',
      createConditionalKeyHandler(this._handleKeyboardControl.bind(this))
    );
  },

  teardown: function () {
    $(window).off('resize.videojs', this._handleResize);
    $(document).off('keydown.videoView');
    playerManager.destroy();
  },

  clickHitBackground: function (e) {
    var hitBackground = e.target.getAttribute('id') === this.id;
    return hitBackground;
  },

  setupMode: function (mode) {
    $('.cp-toolbar-layer').hide();
  },

  _handleKeyboardControl: function (e) {
    if (e.which === keys.SPACE || e.which === keys.ENTER) {
      this.togglePlay();
      e.preventDefault();
    }
  },

  render: function () {
    var type = this.model.get('type');

    this.$el.html(_templateStore.get('playerBody')({
      src: this._getVideoSrc(),
      poster: this._getPosterSrc(),
      type: type,
      kind: this._isVideo ? 'video' : 'audio'
    }));

    playerManager.create(this.playerId, {
      plugins: this._registerPlugins(),
      controls: true,
      ytFullScreenControls: false,
      textTrackDisplay: false,
      errorDisplay: false,
      controlBar: {
        timeDivider: false,
        remainingTimeDisplay: false,
        liveDisplay: false,
        fullscreenToggle: false,
        muteToggle: false,
        volumeMenuButton: false,
        playbackRateMenuButton: true,
        subtitlesButton: false,
        captionsButton: false,
        chaptersButton: false
      },
      autoplay: this._isAutoPlay,
      preload: true,
      width: this._maxWidth,
      height: this._maxHeight
    }).then(this._setupPlayer.bind(this));

    return this;
  },

  play: function () {
    this._videoPlayer.play();
  },

  togglePlay: function () {
    if (this._videoPlayer && this._isPaused) {
      this._videoPlayer.play();
    } else if (this._videoPlayer) {
      this._videoPlayer.pause();
    }
  },

  // Set focus back to our main element if the active element
  // is the iFrame. This is to prevent losing focus to the youtube
  // embedded player.
  _refocusFileViewer: function () {
    if (document.activeElement.tagName === 'IFRAME') {
      var $container = $('#cp-container');
      $container.attr('tabindex', -1);
      $container.focus();
    }
  },

  handleResize: function () {
    this._handleResize();
  },

  _handleResize: function () {
    var containerWidth = Math.max(
      (this.$el.width() - this._paddingNavArrows),
      this._minWidth
    );
    var containerHeight = Math.max(
      (this.$el.height() - this._paddingVertical),
      this._minHeight
    );
    var $videoEl = $(this.el);
    var videoWidth = $videoEl.width();
    var videoHeight = $videoEl.height();

    var ratio = Math.min(
      (containerWidth / videoWidth),
      (containerHeight / videoHeight)
    );
    var newWidth = Math.min(this._maxWidth, (videoWidth * ratio));
    var newHeight = Math.min(this._maxHeight, (videoHeight * ratio));

    $videoEl.css('width', newWidth).css('height', newHeight);
  },

  _videoError: function () {
    var err = new Error('Media failed loading');

    err.title = '无法加载媒体文件';
    err.description = this.model.get('src');
    err.icon = 'cp-multimedia-icon';

    if (!this.viewerReady) {
      $('#' + this.playerId).remove();
      this.trigger('viewerFail', err);
    }
  },

  _videoLoadedMetaData: function () {
    $('#' + this.playerId).addClass('vjs-ready');
    this.trigger('viewerReady');
    this.viewerReady = true;
  },

  _videoVolumeChange: function () {
    var storage = this._fileViewer.getStorage();
    storage.setItem('videoVolume', this._videoPlayer.volume());
  },

  _videoPlay: function () {
    this._refocusFileViewer();
    this._isPaused = false;
    $(this._videoPlayer.el()).removeClass('vjs-has-ended');
  },

  _videoPause: function () {
    this._refocusFileViewer();
    this._isPaused = true;
  },

  _videoEnded: function () {
    $(this._videoPlayer.el()).addClass('vjs-has-ended');
  },

  _restoreVolumeSetting: function () {
    var storage = this._fileViewer.getStorage();
    var volumeLevel = parseFloat(storage.getItem('videoVolume'));
    if (!isNaN(volumeLevel)) {
      this._videoPlayer.volume(volumeLevel);
    }
  },

  _restoreVideoPosterIfNotSet: function () {
    var currentPoster = this._videoPlayer.poster();
    var posterSrc = this._getPosterForCurrentQuality();
    if (this._isVideo && !currentPoster) {
      this._videoPlayer.poster(posterSrc);
    }
  },

  _handlePlayerReady: function () {
    this.viewerReady = false;
    this._restoreVolumeSetting();

    // VideoJS 4.12.15 adds tabindex=0 to control bar play button
    // Tabindex needs to be removed to prevent focus staying on the play button
    // and breaking keyboard control (SPACE) to play/pause.
    $(this._videoPlayer.el()).find('.vjs-control').each(function (idx, el) {
      $(el).removeAttr('tabindex');
    });

    // In case the poster was removed for autoplaying videos
    // it now is added again to be displayed after the video ended.
    this._videoPlayer.one('timeupdate',
      this._restoreVideoPosterIfNotSet.bind(this)
    );
    this._videoPlayer.on('loadedmetadata',
      this._videoLoadedMetaData.bind(this)
    );
    this._videoPlayer.on('volumechange',
      this._videoVolumeChange.bind(this)
    );
    this._videoPlayer.on('error',
      this._videoError.bind(this)
    );
    this._videoPlayer.on('play',
      this._videoPlay.bind(this)
    );
    this._videoPlayer.on('pause',
      this._videoPause.bind(this)
    );
    this._videoPlayer.on('ended',
      this._videoEnded.bind(this)
    );
  },

  _registerPlugins: function () {
    var pluginsObject = {};
    // debugger
    videojs.plugin('pluginProgressTooltips', PluginProgressTooltips);
    pluginsObject.pluginProgressTooltips = {};

    // videojs.plugin('presentation', ButtonPresentationMode.asPlugin(this._fileViewer));
    // pluginsObject.presentation = {viewer: this};

    // videojs.plugin('buttonToggleHd', ButtonToggleHd.asPlugin(this._fileViewer));
    // pluginsObject.buttonToggleHd = {
    //   src: this.model.get('src'),
    //   src_hd: this.model.get('src_hd') || '',
    //   poster: this.model.get('poster') || '',
    //   poster_hd: this.model.get('poster_hd') || this.model.get('poster') || '',
    //   hd_active: this._shouldUseHdSource()
    // };
    //
    // if (this._isYoutube) {
    //   videojs.plugin('buttonYoutube', buttonYoutube.asPlugin(this._fileViewer));
    //   pluginsObject.buttonYoutube = {};
    // }

    return pluginsObject;
  },

  _setUpAudio: function ($player) {
    $player.addClass('vjs-audio');
    if (!this.model.get('poster')) {
      // Set default poster for audio if none is provided
      $player.find('.vjs-poster').addClass('vjs-default-coverart');
    }
  },
  _setupPlayer: function (player) {
    var $player = $('#' + this.playerId);
    console.log(player)
    this._videoPlayer = player;
    console.log("_videoPlayer",  this._videoPlayer, player)
    this._handleResize();

    if (this._isAudio) {
      this._setUpAudio($player);
    }

    player.ready(this._handlePlayerReady.bind(this));
  },

  _shouldUseHdSource: function () {
    if (!this._hasHdSource) {
      return false;
    }

    var playHdDefault = this._fileViewer.getConfig().videoDefaultQualityHd;
    var playHdUser = this._fileViewer.getStorage().getItem('videoQualityHd');
    var playHdEnabled = typeof playHdUser === 'undefined' || playHdUser;

    var playHdSettings = (playHdDefault && playHdEnabled) !== false;

    return this._hasHdSource && playHdSettings;
  },

  _getPosterForCurrentQuality: function () {
    if (this._shouldUseHdSource()) {
      return this.model.get('poster_hd') || this.model.get('poster') || '';
    }
    return this.model.get('poster') || '';
  },

  _getPosterSrc: function () {
    // No poster for autoplaying videos to prevent flickering
    if (this._isAutoPlay && this._isVideo) {
      return '';
    }
    return this._getPosterForCurrentQuality();
  },

  _getVideoSrc: function () {
    if (this._shouldUseHdSource()) {
      return this.model.get('src_hd');
    }
    return this.model.get('src');
  }

});


export default VideoView

