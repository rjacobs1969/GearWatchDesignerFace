/**
 * Created by robin.jacobs on 08/02/16.
 */

(function( gearWatchDesignerProjectFileReader, $, undefined ) {

    var reader = new FileReader();
    var nested = false;

    gearWatchDesignerSettings.processZipFile = function(f) {
        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                try {
                    var zip = new JSZip(e.target.result);
                    extract(zip);
                } catch(e) {
                    $fileContent = $("<div>", {
                        "class" : "alert alert-danger",
                        text : "Error reading " + theFile.name + " : " + e.message
                    });
                }
                if (nested==true){
                    setTimeout(processNested, 10);
                } else {
                    setTimeout(gearWatch.doRenderWatch, 10);
                }
            }
        })(f);
        reader.readAsArrayBuffer(f);
    };

    gearWatchDesignerSettings.getRemoteFile = function(url) {
        var oReq = new XMLHttpRequest();

        oReq.onload = function(e) {
            arraybuffer = oReq.response; // not responseText
            logIt('Received file');
            zip = new JSZip(arraybuffer);
            logIt('Start extracting');
            extract(zip);
            if (nested==true){
                setTimeout(processNested, 10);
            } else {
                logIt('Start rendering watchface');
                setTimeout(gearWatch.doRenderWatch, 10);
            }
        };
        oReq.open("GET", url);
        oReq.responseType = "arraybuffer";
        oReq.send();
    };


    function processNested() {
        logIt('Start extracting nested file');
        nested = false;
        var zip = new JSZip(gearWatch.gwd);
        extract(zip);
        logIt('Start rendering watchface');
        setTimeout(gearWatch.doRenderWatch, 10);
    }

    function extract(zip) {
        logIt('extracting...');
        $.each(zip.files, function (index, zipEntry) {
            var name = zipEntry.name;
            logIt('file: '+name);
            if (name.substr(name.length - 4) == '.gwd') {
                gearWatch.gwd = zipEntry.asArrayBuffer();
                nested = true;
                logIt('GWD is packed inside zip');
            }
            if (name.substr(0, 4)== 'res/') { // we came to the right place
                name = name.substr(4);
                if (name=='watchface.xml') {    //found the watch design
                    gearWatch.watchFaceXml = zipEntry.asText();
                    console.log(gearWatch.watchFaceXml);
                }
                var fileExtention = getFileExtention(name);
                if (name.substr(0, 6)== 'fonts/' && name.length > 6 && name.substr(name.length - 1) != '/') { // found a font
                    var fontdta = zipEntry.asUint8Array();
                    var fontFam = gearWatch.getFontInfo(fontdta);
                    var b64string = base64js.fromByteArray(fontdta);
                    var mime = mimeTypeByFileExt(fileExtention);
                    if (fileExtention == '.png' || fileExtention == '.jpg') {
                        var dataIndex = gearWatch.bitmapFontsData.length;
                        var fontName = getBitmapFontNameFromFilePath(name);
                        logIt('Bitmap font '+fontName);
                        gearWatch.bitmapFontsData.push("data:" + mime + ";base64," + b64string);
                        gearWatch.bitmapFontsIndex[name] = dataIndex;
                        //var dataIndex = gearWatch.bitmapFontsRenders.length;
                        if (!gearWatch.bitmapFontsRenderIndex[fontName]) {
                            var fontRender = new gearWatch.fontRenderer(fontName);
                            var dataIndex = gearWatch.bitmapFontsRenders.length;
                            gearWatch.bitmapFontsRenders.push(fontRender);
                            gearWatch.bitmapFontsRenderIndex[fontName] = dataIndex;
                        }
                    } else {
                        var dataIndex = gearWatch.fontData.length;
                        gearWatch.fontData.push("data:" + mime + ";base64," + b64string);
                        gearWatch.fontFamily.push(fontFam);
                        gearWatch.fontIndex[name] = dataIndex;
                    }
                }
                if (fileExtention == '.png' || fileExtention == '.jpg') {
                    var imgdta = zipEntry.asUint8Array();
                    var dataIndex = gearWatch.imageData.length;
                    var b64string = base64js.fromByteArray(imgdta);
                    var mime = mimeTypeByFileExt(fileExtention);
                    gearWatch.imageData.push("data:"+mime+";base64," + b64string);
                    gearWatch.imageIndex[name] = dataIndex;
                }
            }
        });
    }

    function getBitmapFontNameFromFilePath(filepath) {
        var fontsdir = filepath.substr(6);

        return fontsdir.substr(0, fontsdir.indexOf('/'));
    }

    function getFileExtention(filename) {
        return filename.substr(filename.lastIndexOf('.'));
    }

    function mimeTypeByFileExt(fileExtention) {
        switch(fileExtention) {
            case '.png': return 'image/png';
            case '.jpg': return 'image/jpg';
            case '.ttf': return 'application/x-font-ttf';
        }

        return 'application/octet-stream';
    }

}( window.gearWatchDesignerProjectFileReader = window.gearWatchDesignerProjectFileReader || {}, jQuery ));