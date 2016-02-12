/**
 * Created by robin.jacobs on 24/01/16.
 */


(function( gearWatch, $, undefined ) {

    var parser = new DOMParser();
    var dynamicElements = [];
    var customFontCount = 0;
    var debugOutput = gearWatchDesignerSettings.debug;
    var timer = null;
    var icuFormatter = null;
    var watchFace;
    var watchFaceName;
    var watchFaceWidth;
    var watchFaceHeight;

    gearWatch.fontData = [];
    gearWatch.fontFamily = [];
    gearWatch.fontIndex = {};
    gearWatch.bitmapFontsData = [];
    gearWatch.bitmapFontsIndex = {};
    gearWatch.bitmapFontsRenders = [];
    gearWatch.bitmapFontsRenderIndex = {};
    gearWatch.imageIndex = {};
    gearWatch.imageData = [];
    gearWatch.gwd = null;
    gearWatch.watchFaceXml = '';

    gearWatch.doRenderWatch = function() {
        gearWatch.gwd = null;
        loadFonts();
        var xmlDoc = parser.parseFromString(gearWatch.watchFaceXml,"text/xml");
        watchFace = xmlDoc.getElementsByTagName("watchface");
        watchFaceName = watchFace[0].getAttribute('name');
        watchFaceWidth = watchFace[0].getAttribute('width');
        watchFaceHeight = watchFace[0].getAttribute('height');

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
        }
        createBitmapFonts(xmlDoc);
        gearWatch.startTimer();

        return mainDomElement;
    };

    function createBitmapFonts(xmlDoc) {
        var fontsNode = xmlDoc.getElementsByTagName('bitmap-fonts');
        if (fontsNode.length>0) {
            fontsNode = fontsNode[0];
            var fonts = fontsNode.getElementsByTagName("bitmap-font");
            for (var fontnr = 0; fontnr < fonts.length; fontnr++) {
                var font = fonts[fontnr];
                var fontName = font.getAttribute('name');
                var fontRenderIndex = gearWatch.bitmapFontsRenderIndex[fontName];
                var render = gearWatch.bitmapFontsRenders[fontRenderIndex];
                var characters = font.getElementsByTagName("character");
                for (var charnr = 0; charnr < characters.length; charnr++) {
                    var character = characters[charnr];
                    var letter = character.getAttribute('name');
                    var width = character.getAttribute('width');
                    var height = character.getAttribute('height');
                    var file = character.getAttribute('filepath');
                    var filename = 'fonts/' + fontName + '/' + file;
                    var dataUri = getBitFontDataUri(filename);
                    var letterAscii = letter.charCodeAt(0);
                    var key = 'L_' + letterAscii;
                    render[key] = '<img height="' + height + '" width="' + width + '" src="' + dataUri + '">';
                }
            }
        }
    }

    gearWatch.startTimer = function() {
        var intervalTime = 500 / gearWatchDesignerSettings.framesPerSecond;
        timer = setInterval(renderAll, intervalTime);
    };

    gearWatch.stopTimer = function() {
        clearInterval(timer);
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
        textPartElement.setAttribute('data-fontType',element.getAttribute('data-fontType'));
        textPartElement.setAttribute('data-fontFamily',element.getAttribute('data-fontFamily'));
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



    function loadFonts() {
        var numberOfFonts = gearWatch.fontData.length;
        for (var nr=0; nr<numberOfFonts; nr++) {
            var className = 'FONT_'+nr;
            var fontFam = gearWatch.fontFamily[nr];
            $("head").prepend('<style type="text/css">' +
                "@font-face {\n" +
                "\tfont-family: \""+fontFam+"\";\n" +
                "\tsrc: local('☺'), url('"+gearWatch.fontData[nr]+"') format('truetype');\n" +
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
            if (fontName) {
                var fontIdx = getFontIndex('fonts/' + fontName + '.ttf');
                domElement.style.fontFamily = gearWatch.fontFamily[fontIdx];
                domElement.style.fontSize = font.getAttribute('size');
                customFontCount++;
                domElement.setAttribute('data-fontType','ttf');
                domElement.setAttribute('data-fontFamiliy',fontName);
            } else {
                var family = font.getAttribute('family');
                if (family) {
                    domElement.setAttribute('data-fontType', 'bmf');
                    domElement.setAttribute('data-fontFamiliy', family);
                }else{
                    var sizeNode = getNodeByName(part, 'style');
                    if (sizeNode) {
                        domElement.style.fontFamily = sizeNode.getAttribute('typeFace');
                        domElement.style.fontSize = sizeNode.getAttribute('size');
                        domElement.style.fontWeight = font.getAttribute('weight');
                        domElement.setAttribute('data-fontType','ttf');
                        domElement.setAttribute('data-fontFamiliy', 'TizenSans');
                    }
                }
            }
            return true;
        } else {
            domElement.setAttribute('data-fontType','ttf');
            domElement.setAttribute('data-fontFamiliy','buildin');
            domElement.style.fontFamily = 'TizenSans';
            domElement.style.fontSize = '24px';

        }

        return false;
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

    /*****************************************************************/
    /**                 RENDER
     *****************************************************************/

    function renderAll() {
        for (toUpdate = 0; toUpdate<dynamicElements.length; toUpdate++) {
            var elementToRender = dynamicElements[toUpdate];
            switch (elementToRender.type) {
                case 'hand': renderHand(elementToRender);   break;
                case 'text':
                    var renderElement = document.getElementById(elementToRender.objectId);
                    var fontRenderType = renderElement.getAttribute('data-fontType');
                    //console.log(elementToRender.objectId);
                    if (fontRenderType=='ttf') {
                        renderTextNormal(elementToRender);   break;
                    } else {
                        renderText(elementToRender);
                    }
                    break;

            }

        }
        animAll();
        conditionAll();
    }

    var animTick = true;
    function animAll() {
        animTick = !animTick;
        if (animTick) {
            // todo : process animations
        }
    }

    function conditionAll()
    {
        // todo check conditions
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

    function renderHand(that) {
        var value = valueFromSource(that.dataSource)-that.valueOffset;
        var angle = (that.degreesPerValueUnit * value)+that.angleOffset;
        var renderElement = document.getElementById(that.objectId);
        if (renderElement) {
            renderElement.style.transform = 'rotate('+angle+'deg)';
        }
    }

    function renderTextNormal(that) {
        var value = valueFromSource(that.dataSource, that.dataFormatter);
        var renderElement = document.getElementById(that.objectId);
        if (renderElement) {
            renderElement.innerHTML = value;
        }
    }

    function renderText(that) {
        var value = valueFromSource(that.dataSource, that.dataFormatter);
        var renderElement = document.getElementById(that.objectId);
        var htmlValue = '';
        var renderer = gearWatch.bitmapFontsRenders[1];
        for (var n=0; n < value.length; n++) {
            var char = value.charCodeAt(n);
            var rendered = renderer['L_'+char];
            if (rendered) {
                htmlValue = htmlValue + rendered;
            }
        }
        if (renderElement) {
            renderElement.innerHTML = htmlValue;
        }
    }

    gearWatch.fontRenderer = function(name)  {
        this.name = name;
        //this.renderText = function(text) {
          //  console.log(text);
            //for (var n; n<text.length; n++) {
            //    var char = text.charCodeAt(n);
             //   var key = 'L_'+char;
                //if(this[key]) {
               //     console.log(n + ' = '+ char);
                //}
            //}
        //};
    };

    function DynamicText(data, obId) {
        this.type = 'text';
        this.dataSource = 'icu';
        this.dataFormatter = icuFormatter.dateFormatter({raw: data.childNodes[0].nodeValue});
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

    /*****************************************************************/
    /**                 DEBUG Helpers
     *****************************************************************/

    function htmlEntities(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    }

    /*****************************************************************/
    /**                 Private setters and getters
     *****************************************************************/

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

    function getDataUri(name){
        var index = gearWatch.imageIndex[name];
        return gearWatch.imageData[index];
    }

    function getBitFontDataUri(name){
        var index = gearWatch.bitmapFontsIndex[name];
        return gearWatch.bitmapFontsData[index];
    }

    function getFontIndex(name) {
        return gearWatch.fontIndex[name];
    }

    function getMainElementId(node) {
        return (node.getAttribute('type') == 'ambient' ) ? 'watchAmbient' : 'watchActive';
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

    /*****************************************************************/
    /**                 Public setters and getters
     *****************************************************************/
    gearWatch.setWatchXml = function(x) {
        gearWatch.watchFaceXml = x;
    };

    gearWatch.getWatchXml = function() {
        return gearWatch.watchFaceXml;
    };

    gearWatch.setIcuFormatter = function(formatter) {
        icuFormatter = formatter;
    };

    gearWatch.getFontInfo = function(fdata) {
        //console.log(fdata);
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
        return 'TizenSans';
    };

}( window.gearWatch = window.gearWatch || {}, jQuery ));

function hhh(){
    //getRemoteFile('https://dl.dropboxusercontent.com/content_link/nq30G4I3jvzRtccEd6JC5ErCmMU3rb0PTW4BAHPgJvSASfIXJ8YE0usAG0chTV10/file?dl=1');
    gearWatchDesignerSettings.getRemoteFile('http://www.thesauerreport.com/gwdtest.zip');
}

function hhh2(){
    //getRemoteFile('https://dl.dropboxusercontent.com/content_link/nq30G4I3jvzRtccEd6JC5ErCmMU3rb0PTW4BAHPgJvSASfIXJ8YE0usAG0chTV10/file?dl=1');
    gearWatchDesignerSettings.getRemoteFile('http://www.thesauerreport.com/B50.zip');
}
