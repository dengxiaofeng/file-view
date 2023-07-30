import { HandleZip } from './HandleZip'
import { LuckyFile } from './ToLuckySheet/LuckyFile'

export class LuckyExcelHelpers {

  static transformExcelToLucky(excelFile, callback) {
    const handleZip = new HandleZip(excelFile);

    handleZip.unzipFile(function(files) {
      const luckyFile = new LuckyFile(files, excelFile.name);
      const luckysheetfile = luckyFile.Parse();
      const exportJson = JSON.parse(luckysheetfile);
      if(callback) {
        callback(exportJson, luckysheetfile)
      }
    }, (error) => console.error(error))
  }

  static transformExcelToLuckyByUrl(url, name, callback) {
    const handleZip = new HandleZip(null);
    handleZip.unzipFileByUrl(url, (files) => {
      const luckyFile = new LuckyFile(files, name);
      const luckysheetfile = luckyFile.Parse();
      const exportJson = JSON.parse(luckysheetfile);
      if(callback) {
        callback(exportJson, luckysheetfile)
      }
    }, (error) => console.log(error))
  }
}
