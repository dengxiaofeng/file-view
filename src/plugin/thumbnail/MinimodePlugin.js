import MinimodeToggle from './MinimodeToggle'
import FileMinimodeView from './MinimodePanel'

const minimodePlugin = function (fileViewer) {
  const fileView = fileViewer.getView()
  const sinkView = fileView.fileSinkView;
  const metaView = fileView.fileMetaView;

  if (!fileViewer.getConfig().enableMiniMode) {
    return
  }

  metaView.addLayerView('minimodeToggle', MinimodeToggle, {
    predicate: MinimodeToggle.predicate
  })

  sinkView.addPanelView('minimode', FileMinimodeView)
}


export default minimodePlugin
