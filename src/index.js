// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
  // import "core-js/fn/array.find"
  // ...

// export default class DummyClass {
// 	constructor(name,age){
// 		this.name=name
// 		this.age=age
// 		this.body = $('body')
// 	}
// }


import FileViewer from './core/component/FileView.js'
import './resource/css/fileview.css'
import './resource/luckysheet/plugins/js/plugin'
// import luckysheet from 'luckysheet/dist/luckysheet.esm'
import minimodePlugin from './plugin/thumbnail/MinimodePlugin'
import $ from 'jquery'
FileViewer.registerPlugin('minimode', minimodePlugin)
export default FileViewer
