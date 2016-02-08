/**
 * Created by robin.jacobs on 24/01/16.
 */


var imageData = [];
var fontData = [];
var fontFamily = [];
var imageIndex = {};
var fontIndex = {};


var reader = new FileReader();
var nested = false;
var gwd = null;

var watchFaceXml = '';

function processZipFile(f) {
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
}

function hhh(){
    //getRemoteFile('https://dl.dropboxusercontent.com/content_link/nq30G4I3jvzRtccEd6JC5ErCmMU3rb0PTW4BAHPgJvSASfIXJ8YE0usAG0chTV10/file?dl=1');
    getRemoteFile('http://www.thesauerreport.com/gwdtest.zip');
}

function hhh2(){
    //getRemoteFile('https://dl.dropboxusercontent.com/content_link/nq30G4I3jvzRtccEd6JC5ErCmMU3rb0PTW4BAHPgJvSASfIXJ8YE0usAG0chTV10/file?dl=1');
    getRemoteFile('http://www.thesauerreport.com/B50.zip');
}

function getRemoteFile(url) {
    var oReq = new XMLHttpRequest();

    oReq.onload = function(e) {
        arraybuffer = oReq.response; // not responseText
        console.log('received');
        zip = new JSZip(arraybuffer);
        console.log('start extract');
        extract(zip);
        if (nested==true){
            setTimeout(processNested, 10);
        } else {
            console.log('start rendering watchface');
            setTimeout(gearWatch.doRenderWatch, 10);
        }
    }
    oReq.open("GET", url);
    oReq.responseType = "arraybuffer";
    oReq.send();
}


function processNested() {
    console.log('start extracting nested file');
    nested = false;
    var zip = new JSZip(gwd);
    extract(zip);
    console.log('start rendering watchface');
    setTimeout(gearWatch.doRenderWatch, 10);
}

function extract(zip) {
    console.log('extracting...');
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
                var dataIndex = imageData.length;
                var b64string = StringView.bytesToBase64(imgdta);
                imageData.push("data:image/png;base64," + b64string);
                imageIndex[name] = dataIndex;
               // console.log(name);
            }
            if (name.substr(name.length - 4) == '.jpg') {
                var imgdta = zipEntry.asUint8Array();
                var dataIndex = imageData.length;
                var b64string = StringView.bytesToBase64(imgdta);
                imageData.push("data:image/jpg;base64," + b64string);
                imageIndex[name] = dataIndex;
            }
        }
    });
}

(function( gearWatch, $, undefined ) {
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

    var xmlText = null;
    var parser = new DOMParser();
    var dynamicElements = [];
    var customFontCount = 0;
    var debugOutput = false;



    gearWatch.doRenderWatch = function() {
        gwd = null;
        loadFonts();
        xmlText = watchFaceXml;
        var xmlDoc = parser.parseFromString(xmlText,"text/xml");
        var watchFace = xmlDoc.getElementsByTagName("watchface");
        var watchFaceName = watchFace[0].getAttribute('name');
        //var watchFaceWidth = watchFace[0].getAttribute('width');
        //var watchFaceHeight = watchFace[0].getAttribute('height');

        groups = xmlDoc.getElementsByTagName('groups');
        for (mainGroupNumber = 0; mainGroupNumber < groups.length; mainGroupNumber++) {
            mainGroup = groups[mainGroupNumber];
            mainElementId = getMainElementId(mainGroup);
            mainDomElement = document.getElementById(mainElementId);
            groupsInMain = mainGroup.getElementsByTagName("group");
            for (groupNumber = 0; groupNumber < groupsInMain.length; groupNumber++) {
                group = groupsInMain[groupNumber];
                domElement = createDomElement(group);
                mainDomElement.appendChild(domElement);
                if (debugOutput) { console.log(mainGroupNumber + '/' + groupNumber + ':' + group.getAttribute('name'));}
                partsInGroup = group.getElementsByTagName("part");
                for (partsNumber = 0; partsNumber < partsInGroup.length; partsNumber++) {
                    part = partsInGroup[partsNumber];
                    domPart = createDomPart(part);
                    if (domPart != null) {
                        domElement.appendChild(domPart);
                    }
                }
            }
            setInterval(renderAll, 20);
        }

        return mainDomElement;
    };

    gearWatch.getFontInfo = function(fdata) {
        //console.log(fdata);
        var fontData = [];
        var numberOfTables = 256*fdata[4] + fdata[5];
        for (var tables=0; tables<numberOfTables; tables++) {
            var offset = (16 * tables) + 12;
            var tableName = String.fromCharCode(fdata[offset])+String.fromCharCode(fdata[offset+1])+String.fromCharCode(fdata[offset+2])+String.fromCharCode(fdata[offset+3]);
            if (tableName == 'name') {
                var ntOffset = 256*256*256*fdata[offset+8] + 256*256*fdata[offset+9] + 256*fdata[offset+10] + fdata[offset+11];
                var numberOfNameRecords = 256 * fdata[ntOffset+2] + fdata[ntOffset+3];
                var offsetStorageDec = 256 * fdata[ntOffset+4] + fdata[ntOffset+5];
                var nameOffset = ntOffset + offsetStorageDec;
                for (var nr=0; nr<numberOfNameRecords; nr++) {
                    var idOffset = ntOffset + (nr * 12) + 6;
                    var nameId = 256 * fdata[idOffset + 6] + fdata[idOffset + 7];
                    var stringLength = 256 * fdata[idOffset + 8] + fdata[idOffset + 9];
                    var stringOffset = 256 * fdata[idOffset + 10] + fdata[idOffset + 11];
                    if (nameId == 1) {
                        var name = '';
                        for (var charCount = 0; charCount < stringLength; charCount++) {
                            var address = nameOffset + stringOffset + charCount;
                            if (fdata[address] > 0) {
                                name = name + String.fromCharCode(fdata[address]);
                            }
                        }
                        return name;
                    }
                }
            }
        }
        return 'arial';
    };

    function createDomPart(part) {
        var partType = part.getAttribute('type');
        switch (partType) {
            case 'image': return createImageElement(part);
            case 'text':  return createTextElement(part);
            default: console.log('Unknown part type');
        }

        return null;
    }

    function createImageElement(part) {
        var imageDomElement = document.createElement('IMG');
        var imageUrl = getImageUrl(part);
        var imagePartId = getPartMeta(part, 'id');
        var imagePartType = getPartMeta(part, 'type');

        imageDomElement.setAttribute('id', imagePartId);
        imageDomElement.setAttribute('src', getDataUri(imageUrl, "data:image/png;base64,"));//
        imageDomElement.style.position = 'absolute';
        imageDomElement.style.width = part.getAttribute('width');
        imageDomElement.style.height = part.getAttribute('height');
        imageDomElement.style.left = part.getAttribute('x');
        imageDomElement.style.top = part.getAttribute('y');

        var renderObject = createRender(imagePartType, part, imagePartId);
        if (renderObject) {
            if (renderObject.smooth == true) {
                imageDomElement.style.transition = '1s linear';
            }
            dynamicElements.push(renderObject);
        }
        //transform-origin
        //imageDomElement.style.WebkitFilter = 'hue-rotate(218)';

        return imageDomElement;
    }

    var textPartIdCount = 0;

    function createTextElement(part) {

        var textPartId = getPartMeta(part, 'id') + textPartIdCount;
        var textPartType = getPartMeta(part, 'type');
        textPartIdCount++;
        var textDomElement = document.createElement('DIV');
        textDomElement.setAttribute('id', textPartId);
        textDomElement.style.position = 'absolute';
        textDomElement.style.width = part.getAttribute('width');
        textDomElement.style.height = part.getAttribute('height');
        textDomElement.style.left = part.getAttribute('x');
        textDomElement.style.top = part.getAttribute('y');

        loadFont(part, textDomElement);
        setColorFromPart(part, textDomElement);
        setTextPart(part, textDomElement, textPartId, textPartType);
        setTextRotate(part, textDomElement);

        return textDomElement;
    }

    function setTextRotate(part, element) {
        //<rotation angle="37.0" center_x="82" center_y="16"/>
        var rotate = getNodeByName(part, 'rotation');
        if (rotate!=null) {
            var angle = rotate.getAttribute('angle');
            element.style.transform = 'rotate('+angle+'deg)';
        }
    }

    function setRenderObject(imagePartType, part, imagePartId) {
        var renderObject = createRender(imagePartType, part, imagePartId);
        if (renderObject) {
            dynamicElements.push(renderObject);
        }
    }

    function setTextPart(part, element, textPartId, textPartType) {
        var textNode = getTextNode(part);
        var textPartElement = document.createElement('DIV');
        var id = textPartId + '_T';
        textPartElement.setAttribute('id', id);
        textPartElement.style.position = 'relative';
        textPartElement.style.top = '50%';
        textPartElement.style.transform = 'translateY(-50%)';
        textPartElement.style.overflow = 'hidden';
        textPartElement.style.whiteSpace = 'nowrap';

        if (textNode) {
            var align = textNode.getAttribute('align');
            if (align) {
                textPartElement.style.textAlign = align;
            }

            var text = setText(textNode, id, textPartType);
            var actualText = document.createTextNode(text);
            textPartElement.appendChild(actualText);
        }
        element.appendChild(textPartElement);
    }

    function setText(textNode, textPartId, textPartType) {
        var content = getNodeByName(textNode, 'icu-skeleton');
        if (content!=null) {
            setRenderObject(textPartType, content, textPartId);
            return '';
        }

        return content;
    }

    function setColorFromPart(part, element) {
        var color = getColorNode(part);
        if (color!=null) {
            var alfa = color.getAttribute('a') / 255;
            var red = color.getAttribute('r');
            var green = color.getAttribute('g');
            var blue = color.getAttribute('b');
            element.style.color = 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alfa + ')';
        }
    }

    function loadFonts() {
        var numberOfFonts = fontData.length;
        for (var nr=0; nr<numberOfFonts; nr++) {
            var className = 'FONT_'+nr;
            var fontFam = fontFamily[nr];
            $("head").prepend('<style type="text/css">' +
                "@font-face {\n" +
                "\tfont-family: \""+fontFam+"\";\n" +
                "\tsrc: local('☺'), url('"+fontData[nr]+"') format('truetype');\n" +
                "}\n" +
                "\t."+className+" {\n" +
                "\tfont-family: "+fontFam+" !important;\n" +
                "}\n" +
                "</style>");
        }
    }

    function loadFont(part, domElement) {
        var font = getFontNode(part);
        if (font) {
            var fontName  = font.getAttribute('filename');
            //console.log(fontName);
            var fontIdx = getFontIndex('fonts/'+fontName+'.ttf');
            domElement.style.fontFamily = fontFamily[fontIdx];
            domElement.style.fontSize = font.getAttribute('size');
            customFontCount++;
            return true;
        }

        return false;
    }

    function getTextNode(part) {
        return getNodeByName(part, 'text');
    }

    function getFontNode(part) {
        return getNodeByName(part, 'font');
    }

    function getColorNode(part) {
        return getNodeByName(part, 'color');
    }

    function getNodeByName(part, nodeName) {
        var node = part.getElementsByTagName(nodeName);

        return (node.length>0) ? node[0] : null;
    }

    function getImageUrl(part) {
        var imageNode = part.getElementsByTagName("image")[0];
        return imageNode.textContent;
    }

    var currentGroupId = '';

    function createDomElement(group) {
        currentGroupId = group.getAttribute('name');
        var groupDomElement = document.createElement('DIV');
        groupDomElement.setAttribute('id', group.getAttribute('name'));
        groupDomElement.setAttribute('name', group.getAttribute('name'));
        groupDomElement.style.position = 'absolute';
        groupDomElement.style.left = group.getAttribute('x') + 'px';
        groupDomElement.style.top = group.getAttribute('y') + 'px';
        groupDomElement.style.width = group.getAttribute('width') + 'px';
        groupDomElement.style.height = group.getAttribute('height') + 'px';

        return groupDomElement;
    }

    function renderAll() {
        for (toUpdate = 0; toUpdate<dynamicElements.length; toUpdate++) {
            elementToRender = dynamicElements[toUpdate];
            switch (elementToRender.type) {
                case 'hand': renderHand(elementToRender);   break;
                case 'text': renderText(elementToRender);   break;
            }

        }
    }

    function createRender(metaType, data, obId) {
        var ob = null;
        switch (metaType) {
            case 'hands':           ob = new Hands(data, obId);         break;
            case 'digitalclock':    ob = new DynamicText(data, obId);   break;
            case 'background':
            case 'static':
            default:

        }

        return ob;
    }

    function DynamicText(data, obId) {
        this.type = 'text';
        this.dataSource = 'icu';
        this.dataFormatter = cldrMachine.dateFormatter({ raw: data.childNodes[0].nodeValue});
        this.objectId = obId;
    }

    function Hands(data, obId) {
        var rotations = part.getElementsByTagName('rotation');
        var rotation = rotations[0];
        var angleEnd = Number(rotation.getAttribute('end_angle'));
        var angleStart = Number(rotation.getAttribute('start_angle'));
        var valueStart = Number(rotation.getAttribute('start_value'));
        var valueEnd = Number(rotation.getAttribute('end_value'));
        var smoothSeconds = rotation.getAttribute('animation');
        var angleRange = angleEnd-angleStart;
        var valueRange = valueEnd-valueStart;
        this.type = 'hand';
        this.objectId =  obId;//or currentGroupId;//
        this.dataSource = rotation.getAttribute('source');
        this.valueOffset = valueStart;
        this.angleOffset = angleStart;
        this.degreesPerValueUnit = angleRange/valueRange;
        this.smooth = false;//(smoothSeconds == 'sweep60s');
    }

    function renderHand(that) {
        var value = valueFromSource(that.dataSource)-that.valueOffset;
        var angle = (that.degreesPerValueUnit * value)+that.angleOffset;
        var renderElement = document.getElementById(that.objectId);
        if (renderElement) {
            renderElement.style.transform = 'rotate('+angle+'deg)';
        }
    }

    function renderText(that) {
        var value = valueFromSource(that.dataSource, that.dataFormatter);
        var renderElement = document.getElementById(that.objectId);
        if (renderElement) {
            renderElement.innerHTML = value;
        }
    }


    // todo move to desktop.js
    // todo make version in watch.js
    function valueFromSource(source, icu) {
        var  d = new Date();
        var  miliSeconds = d.getMilliseconds();
        var  seconds = d.getSeconds();
        var  minutes = d.getMinutes();
        var  hours = d.getHours();
        switch (source) {
            case 'hour0-23.minute':
                return hours + ((minutes*1.66666666)/100);
            case 'minute.second':
                return minutes + ((seconds*1.66666666)/100);
            case 'minute':
                return minutes;
            case 'second':
                return seconds;
            case 'second.millisecond':
                return seconds + (miliSeconds/1000);
            case 'month':
                return 1+ d.getMonth();
            case 'day':
                return d.getDay();
            case 'icu':
                return icu(d);
            default: return 0;
        }
    }

    function getIcuValue(icuFormatString) {
        var  d = new Date();
        return d.getSeconds();
    }

    function getPartMeta(part, attribute) {
        // background
        // hands
        // digitalclock
        var metas = part.getElementsByTagName('metadata');
        for (metaCount = 0; metaCount<metas.length; metaCount++) {
            meta = metas[metaCount];
            metaType =  meta.getAttribute(attribute);
            if (metaType!=null) {
                return metaType;
            }
        }

        return 'static';
    }

    function getMainElementId(node) {
        return (node.getAttribute('type') == 'ambient' ) ? 'watchAmbient' : 'watchActive';
    }

    function htmlEntities(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getDataUri(name){
        var index = imageIndex[name];
        return imageData[index];
    }

    function getFontIndex(name) {
        return fontIndex[name];
    }

    /*****************************************************************/
    /**                 Public setters and getters
     *****************************************************************/
    gearWatch.setWatchXml = function(x) {
        watchFaceXml = x;
    };

    gearWatch.getWatchXml = function() {
        return watchFaceXml;
    };

}( window.gearWatch = window.gearWatch || {}, jQuery ));


var cldrMachine = null;

$.when(
    $.get( "cldr/main/en/ca-gregorian.json" ),
    $.get( "cldr/main/en/numbers.json"),
    $.get( "cldr/main/en/timeZoneNames.json" ),
    $.get( "cldr/supplemental/likelySubtags.json" ),
    $.get( "cldr/supplemental/timeData.json" ),
    $.get( "cldr/supplemental/numberingSystems.json" ),
    $.get( "cldr/supplemental/weekData.json" )
).then(function() {

    // Normalize $.get results, we only need the JSON, not the request statuses.
    return [].slice.apply( arguments, [ 0 ] ).map(function( result ) {
        return result[ 0 ];
    });

}).then( Globalize.load ).then(function() {
    cldrMachine = Globalize( "en" );
});
