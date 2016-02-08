/**
 * Created by robin.jacobs on 08/02/16.
 */

(function( gearWatchDesignerProjectFileReader, $, undefined ) {

    var debug = gearWatchDesignerSettings.debug;

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
    }


    function processNested() {
        logIt('Start extracting nested file');
        nested = false;
        var zip = new JSZip(gwd);
        extract(zip);
        logIt('Start rendering watchface');
        setTimeout(gearWatch.doRenderWatch, 10);
    }

    function extract(zip) {
        logIt('extracting...');
        $.each(zip.files, function (index, zipEntry) {
            var name = zipEntry.name;
            //console.log('processsing '+name);
            if (name.substr(name.length - 4) == '.gwd') {
                console.log('nested zip detected');
                gwd = zipEntry.asArrayBuffer();
                nested = true;
            }
            if (name.substr(0, 4)== 'res/') { // we came to the right place
                name = name.substr(4);
                if (name=='watchface.xml') {    //found the watch design
                    watchFaceXml = zipEntry.asText();
                    //if (debugOutput) {
                    //    $("#xmlDebug").html('<H1>XML:</H1>'+htmlEntities(watchFaceXml));
                    //}
                }

                if (name.substr(0, 6)== 'fonts/' && name.length > 6) { // found a font
                    var fontdta = zipEntry.asUint8Array();
                    var fontFam = gearWatch.getFontInfo(fontdta);
                    var dataIndex = fontData.length;
                    var b64string = StringView.bytesToBase64(fontdta);
                    fontData.push("data:application/x-font-ttf;base64," + b64string);
                    fontFamily.push(fontFam);
                    fontIndex[name] = dataIndex;
                }
                if (name.substr(name.length - 4) == '.png') {
                    var imgdta = zipEntry.asUint8Array();
                    var dataIndex = gearWatch.imageData.length;
                    var b64string = StringView.bytesToBase64(imgdta);
                    gearWatch.imageData.push("data:image/png;base64," + b64string);
                    imageIndex[name] = dataIndex;
                    // console.log(name);
                }
                if (name.substr(name.length - 4) == '.jpg') {
                    var imgdta = zipEntry.asUint8Array();
                    var dataIndex = gearWatch.imageData.length;
                    var b64string = StringView.bytesToBase64(imgdta);
                    gearWatch.imageData.push("data:image/jpg;base64," + b64string);
                    imageIndex[name] = dataIndex;
                }
            }
        });
    }


    ////Private Property
    //var isHot = true;
    //
    ////Public Property
    //gearWatch.ingredient = "Bacon Strips";
    //
    ////Public Method
    //gearWatch.fry = function() {
    //    var oliveOil;
    //
    //    addItem( "\t\n Butter \n\t" );
    //    addItem( oliveOil );
    //    console.log( "Frying " + gearWatch.ingredient );
    //};
    //
    ////Private Method
    //function addItem( item ) {
    //    if ( item !== undefined ) {
    //        console.log( "Adding " + $.trim(item) );
    //    }
    //}

}( window.gearWatchDesignerProjectFileReader = window.gearWatchDesignerProjectFileReader || {}, jQuery ));