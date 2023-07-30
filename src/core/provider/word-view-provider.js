import $ from 'jquery'
import wordPlugin from '../../plugin/word/word-plugin'
function wordViewProvider() {
  return $.Deferred().resolve(wordPlugin)
}

export default wordViewProvider;
