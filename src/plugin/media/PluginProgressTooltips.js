import $ from 'jquery'
import { _templateStore } from '../../core/store/template-store';

var PluginProgressTooltips = function (options) {
  var player = this;

  var init = function () {
    $('.vjs-tip', $(player.el())).remove();
    var tipHtml = _templateStore.get('progressTooltip')();
    console.log(tipHtml)
    $('.vjs-progress-control', $(player.el())).after(tipHtml);

    $('.vjs-progress-holder', $(player.el())).on('mousemove', function (event) {
      var minutes, seconds, seekBar, timeInSeconds, mousePosition;

      seekBar = player.controlBar.progressControl.seekBar;
      mousePosition = (event.pageX - $(seekBar.el()).offset().left) / seekBar.width();
      timeInSeconds = mousePosition * player.duration();

      if (timeInSeconds === player.duration()) {
        timeInSeconds = timeInSeconds - 0.1;
      }

      minutes = Math.floor(timeInSeconds / 60);
      seconds = Math.floor(timeInSeconds - minutes * 60);

      if (seconds < 10) {
        seconds = '0' + seconds;
      }

      $('.vjs-tip-inner', $(player.el())).text([ minutes, ':', seconds ].join(''));

      var $el = $('.vjs-control-bar', $(player.el()));
      var tooltipWidth = $('.vjs-tip', $(player.el())).outerWidth();
      var left = event.pageX - $el.offset().left - Math.round(tooltipWidth / 2);
      $('.vjs-tip', $(player.el())).css('left', left + 'px').css('display', 'block');
    })

    $('.vjs-progress-holder, .vjs-play-control', $(player.el())).on('mouseout', function () {
      $('.vjs-tip', $(player.el())).css('display', 'none');
    })
  }
  this.on('loadedmetadata', init);
}

export default PluginProgressTooltips
