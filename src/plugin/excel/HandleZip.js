import JSZip from 'jszip'
import { getBinaryContent } from './common/methods'

export class HandleZip {
  constructor(file) {
    if(file instanceof File) {
      this.uploadFile = file
    } else {
      this.workBook = file
    }
  }

  unzipFile(successFunc, errorFunc) {
    JSZip.loadAsync(this.uploadFile).then(zip => {
      let fileList = {};
      let lastIndex = Object.keys(zip.files).length;
      let index = 0;
      zip.forEach((relativePath, zipEntry) => {
        let fileName = zipEntry.name;
        let fileNameArr = fileName.split(".");
        let suffix = fileNameArr[fileNameArr.length-1].toLowerCase();
        let fileType = "string";
        if(suffix in {"png":1, "jpeg":1, "jpg":1, "gif":1,"bmp":1,"tif":1,"webp":1}){
          fileType = "base64";
        } else if (suffix === "emf") {
          fileType = "arraybuffer";
        }

        zipEntry.async(fileType).then(data => {
          if(fileType==="base64"){
            data = "data:image/"+ suffix +";base64," + data;
          }
          fileList[zipEntry.name] = data;
          if(lastIndex===index+1){
            successFunc(fileList);
          }
          index++;
        })
      })
    }, (error) => errorFunc(error))
  }

  unzipFileByUrl(url, successFunc, errorFunc) {
    // const new_zip = new JSZip();

    getBinaryContent(url, (err, data) => {
      if(err) {
        throw err
      }

      JSZip.loadAsync(data).then(zip => {
        let fileList = {}, lastIndex = Object.keys(zip.files).length, index = 0;
        zip.forEach(function(relativePath, zipEntry) {
          let fileName = zipEntry.name;
          let fileNameArr = fileName.split(".");
          let suffix = fileNameArr[fileNameArr.length-1].toLowerCase();
          let fileType = "string";
          if(suffix in {"png":1, "jpeg":1, "jpg":1, "gif":1,"bmp":1,"tif":1,"webp":1,}){
            fileType = "base64";
          }
          else if(suffix==="emf"){
            fileType = "arraybuffer";
          }
          zipEntry.async(fileType).then(function (data) {
            if(fileType==="base64"){
              data = "data:image/"+ suffix +";base64," + data;
            }
            fileList[zipEntry.name] = data;
            if(lastIndex===index+1){
              successFunc(fileList);
            }
            index++;
          });
        })
      }, (error) => errorFunc(error))
    })

  }
}
