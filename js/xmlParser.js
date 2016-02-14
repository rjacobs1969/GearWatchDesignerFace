/**
 * Created by robin.jacobs on 24/01/16.
 */


(function( gearWatch, $, undefined ) {

    var parser = new DOMParser();
    var dynamicElements = [];
    var customFontCount = 0;
    var timer = null;
    var animTimer = null;
    var icuFormatter = null;
    var watchFace;
    var watchFaceName;
    var watchFaceWidth;
    var watchFaceHeight;
    var imageSets = [];
    var hasAmbient = false;

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

    gearWatch.reset = function() {
        showHideAmbient(false);
        gearWatch.stopTimer();
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
        animTimer = null;
        hasAmbient = false;
        parser = new DOMParser();
        dynamicElements = [];
        customFontCount = 0;
        timer = null;
        imageSets = [];
        document.getElementById('watchActive').innerHTML = '';
        document.getElementById('watchAmbient').innerHTML = '';
    };

    gearWatch.doRenderWatch = function() {
        gearWatch.gwd = null;
        loadFonts();
        var xmlDoc = parser.parseFromString(gearWatch.watchFaceXml,"text/xml");
        watchFace = xmlDoc.getElementsByTagName("watchface");
        watchFaceName = watchFace[0].getAttribute('name');
        watchFaceWidth = watchFace[0].getAttribute('width');
        watchFaceHeight = watchFace[0].getAttribute('height');

        var groups = xmlDoc.getElementsByTagName('groups');
        for (var mainGroupNumber = 0; mainGroupNumber < groups.length; mainGroupNumber++) {
            var mainGroup = groups[mainGroupNumber];
            var mainElementId = getMainElementId(mainGroup);
            var mainDomElement = document.getElementById(mainElementId);
            var groupsInMain = mainGroup.getElementsByTagName("group");
            for (var groupNumber = 0; groupNumber < groupsInMain.length; groupNumber++) {
                var group = groupsInMain[groupNumber];
                var domElement = createDomElement(group);
                mainDomElement.appendChild(domElement);
                logIt(mainGroupNumber + '/' + groupNumber + ':' + group.getAttribute('name'));
                var partsInGroup = group.getElementsByTagName("part");
                for (var partsNumber = 0; partsNumber < partsInGroup.length; partsNumber++) {
                    var part = partsInGroup[partsNumber];
                    var domPart = createDomPart(part);
                    if (domPart != null) {
                        domElement.appendChild(domPart);
                        var imageSetIndex = createImageSet(part);
                    }
                }
                setAction(group, domPart, imageSetIndex);
            }
        }
        showHideAmbient(hasAmbient);
        createBitmapFonts(xmlDoc);
        gearWatch.startTimer();

        return mainDomElement;
    };

    function showHideAmbient(show) {
        document.getElementById('gear2').style.visibility = (show) ? 'visible':'hidden';
    }

    function createImageSet(part){
        var setIndex = null;
        setsInPart = part.getElementsByTagName("image-set");
        if (setsInPart) {
            var images = [];
            setsInPar =  setsInPart[0];
            if (setsInPar) {
                var repeat = (setsInPar.hasAttribute('repeat')) ? setsInPar.getAttribute('repeat') : null;
                var imagesInPart = setsInPar.getElementsByTagName("image");
                for (var imageNr = 0; imageNr < imagesInPart.length; imageNr++) {
                    var image = imagesInPart[imageNr];
                    images.push(image.textContent);
                }
                var imageSet = new ImageSet(images, repeat);
                setIndex = addImageSet(imageSet);
                console.log('added set ' + setIndex);
                if (setsInPar.hasAttribute('delay')) { // animation
                    var targetId = getPartMeta(part, 'id');
                    var delay = setsInPar.getAttribute('delay');
                    animTimer = setInterval(gearWatch.animate.bind(null,targetId, setIndex),delay);
                }
            }

        }

        return setIndex;
    }

    gearWatch.animate = function (targetId, index){
        gearWatch.cycleImageSet(index, 'anim', targetId);
    };

    function setAction(group, domPart, setId){
        // actions: <action on_event="tap" target_part_id="Background0" type="image-set-show-next"/>
        var actionsInGroup = group.getElementsByTagName("action");
        if (actionsInGroup) {
            for (var actionNumber = 0; actionNumber < actionsInGroup.length; actionNumber++) {
                var action = actionsInGroup[actionNumber];
                var event = actionContext.platformAction(action.getAttribute('on_event'));
                var target = action.getAttribute('target_part_id');
                var type = action.getAttribute('type');
                domPart.setAttribute(event, "gearWatch.cycleImageSet("+setId+", '"+type+"', '"+target+"')");
                domPart.style.pointerEvents ='all'; //make it clickable
            }
        }
    }

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
        if (animTimer!= null) {
            clearInterval(animTimer);
        }
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
        imageDomElement.style.pointerEvents = 'none';
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
        //textDomElement.style.verticalAlign = 'middle';
        // textDomElement.style.transform = 'translateY(-50%)';
        textDomElement.style.width = part.getAttribute('width');
        textDomElement.style.height = part.getAttribute('height');
        textDomElement.style.left = part.getAttribute('x');
        textDomElement.style.top = part.getAttribute('y');
        textDomElement.style.pointerEvents = 'none';
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
        textPartElement.style.verticalAlign = 'middle';
        textPartElement.style.overflow = 'hidden';
        textPartElement.style.whiteSpace = 'nowrap';
        textPartElement.style.pointerEvents = 'none';
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
        groupDomElement.style.pointerEvents = 'none';

        return groupDomElement;
    }




    // todo move to desktop.js
    // todo make version in watch.js
    function valueFromSource(source, icu, append) {
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
            case 'battery.percent':
                return actionContext.battery()+append;
            case 'pedometer.step':
                return actionContext.steps()+append;
            case 'heartrate.recent':
                return actionContext.heart()+append;
            case 'static':
                return append;
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
                    if (fontRenderType=='ttf') {
                        renderTextNormal(elementToRender);   break;
                    } else {
                        renderText(elementToRender);
                    }
                    break;
                case 'sysinfo':
                    console.log(elementToRender);

            }

        }
        conditionAll();
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
            case 'sysinfo':         ob = new DynamicSystemInfoText(data, obId);   break;
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
        var value = valueFromSource(that.dataSource, that.dataFormatter, that.dataText);
        var renderElement = document.getElementById(that.objectId);
        if (renderElement) {
            renderElement.innerHTML = value;
        }
    }

    function renderText(that) {
        var value = valueFromSource(that.dataSource, that.dataFormatter, that.dataText);
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

    gearWatch.kk = function(){
        console.log(dynamicElements);
    };

    function DynamicSystemInfoText(data, obId){
        var format = getNodeByName(data, 'format');
        this.type = 'text';
        this.dataSource = format.getAttribute('source');
        this.dataText = data.textContent;
        this.dataFormatter = null;
        this.objectId = obId;
    }

    function DynamicText(data, obId) {
        this.type = 'text';
        this.dataText = '';
        this.dataSource = 'icu';
        this.dataFormatter = icuFormatter.dateFormatter({raw: data.childNodes[0].nodeValue});
        this.objectId = obId;
    }

    function Hands(data, obId) {
        var rotations = data.getElementsByTagName('rotation');
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

    function ImageSet(images, repeat) {
        this.images = images;
        this.currentPos = 0;
        this.maxPos = images.length-1;
        this.repeat = repeat;
    }

    function addImageSet(imageSet) {
        var index = imageSets.length;
        imageSets.push(imageSet);
        return index;
    }

    gearWatch.cycleImageSet =  function (index, action, target) {
        var set = imageSets[index];
        switch (action) {
            case 'image-set-show-next':
                set.currentPos = (set.currentPos<set.maxPos) ? set.currentPos+1 : 0;
                break;
            case 'anim':
                set.currentPos++;
                if (set.currentPos>set.maxPos) {
                    set.currentPos = (set.repeat == 1) ? 0:set.maxPos;
                }
                break;
            case 'image-set-show-previous':
                set.currentPos = (set.currentPos>0) ? set.currentPos-1 : set.maxPos;
                break;
            case 'image-set-show-first':
                set.currentPos = 0;
                break;
            case 'image-set-show-last':
                set.currentPos = set.maxPos;
                break;
            case 'launch':
                alert('Launching app impossible in browser version');
                break;
            default:
                alert('set cycle action "'+action+'" unknown');
                break;
        }
        var image = set.images[set.currentPos];
        var element = document.getElementById(target);
        if (element) {
            element.setAttribute('src', getDataUri(image, "data:image/png;base64,"));
        }
    };

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
        }else{
            content = getNodeByName(textNode, 'format');
            if (content!=null) {
                setRenderObject('sysinfo', textNode, textPartId);
                return '';
            }else{
                console.log(textNode.textContent);
                content = getNodeByName(textNode, 'text');
                console.log(content);
                return textNode.textContent;
            }
        }
    }

    function setColorFromPart(part, element) {
        var color = getColorNode(part);
        if (color!=null) {
            var alfa = color.getAttribute('a') / 255;
            var red = color.getAttribute('r');
            var green = color.getAttribute('g');
            var blue = color.getAttribute('b');
            if (red) {
                element.style.color = 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alfa + ')';
            } else {
                element.style.opacity = alfa;//only alfa info
            }

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
        hasAmbient = (node.getAttribute('type') == 'ambient' );
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

    gearWatch.fontRenderer = function(name) {
        this.name = name;
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
