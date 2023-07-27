# 文件预览

## 安装

### 1. Check out FileViewer

  git clone http://192.168.2.147/dengxiaofeng/file-view.git

### 2. 添加依赖
如果开启document、video，添加以下依赖

    <!--// document viewer-->
    <script src="fileviewer/dist/lib/pdf.js"></script>

    <!--// audio / video viewer-->
    <link href="fileviewer/dist/lib/vidao-js/dist/video-js/video-js.css" rel="stylesheet"/>
    <script src="fileviewer/dist/lib/vidao-js/dist/video-js/video.js"></script>


### 3. 添加 FileViewer

    <link rel="stylesheet" href="fileviewer/dist/fileviewer.min.css"/>
    <script src="fileviewer/dist/fileviewer.min.js"></script>


### 4. 创建 FileViewer

    var viewer = new FileViewer({
        // enable minimode plugin
        enableMiniMode: true,

        // 配置pdf pdf / document viewer
        assets: {
          'pdf-config': {
                workerSrc: 'fileviewer/dist/lib/pdf.worker.js'
          }
        },
        appendTo:'body'//默认挂载到body节点下
    });

### 5. 初始化文件列表


    文件类型:
        图片类型集合:['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/web', 'image/bmp']
        pdf: ['application/pdf']
        word:['application/msword']
        excel:['application/msexcel']
        ppt:['application/mspowerpoint']


    
    viewer.setFiles([
        {
            id: 0,
            src: 'image.png',
            type: 'image/png',
            title: 'image'
        },
        {
            id: 1,
            src: 'document.pdf',
            type: 'application/pdf',
            title: 'document'
        }
    ]);

打开当前文件

    viewer.open({
        id:0 //文件id
    });


## 开启插件

只要页面上包含插件，它们就会自动注册FileViewer， 但是，其中一些需要首先使用某些配置激活:

    // 开启thumial
    var viewer = new FileViewer({ enableMiniMode: true });

## 禁用查看器

默认情况下，所有查看器都已启用,即使可能尚未包含在页面中，要完全禁用查看器，需要覆盖默认配置

    // disable document viewer
    var viewer = new FileViewer({
      viewers: ['image', 'video']
    });

