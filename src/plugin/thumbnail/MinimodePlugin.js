import MinimodeToggle from './MinimodeToggle'
import FileMinimodeView from './MinimodePanel'

var minimodePlugin = function (fileViewer) {
  var fileView = fileViewer.getView()
  var sinkView = fileView.fileSinkView;
  var metaView = fileView.fileMetaView;

  if (!fileViewer.getConfig().enableMiniMode) {
    return
  }

  metaView.addLayerView('minimodeToggle', MinimodeToggle, {
    predicate: MinimodeToggle.predicate
  })

  sinkView.addPanelView('minimode', FileMinimodeView)
}


export default minimodePlugin
