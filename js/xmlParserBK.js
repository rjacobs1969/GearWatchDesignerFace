/**
 * Created by robin.jacobs on 24/01/16.
 */

var xmlText = null;
var imageBaseUrl = '';
var parser = new DOMParser();
var dynamicElements = [];


function doRenderWatch() {
    xmlText = watchFaceXml;
    var xmlDoc = parser.parseFromString(xmlText,"text/xml");
    var watchFace = xmlDoc.getElementsByTagName("watchface");
    var watchFaceName = watchFace[0].getAttribute('name');
    //var watchFaceWidth = watchFace[0].getAttribute('width');
    //var watchFaceHeight = watchFace[0].getAttribute('height');
    $("#debugConsole").html = '<h1>rendering '+watchFaceName+'</h1>';


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
            console.log(mainGroupNumber + '/' + groupNumber + ':' + group.getAttribute('name'));
            partsInGroup = group.getElementsByTagName("part");
            for (partsNumber = 0; partsNumber < partsInGroup.length; partsNumber++) {
                part = partsInGroup[partsNumber];
                domPart = createDomPart(part);
                if (domPart != null) {
                    domElement.appendChild(domPart);
                }
            }
        }
        setInterval(renderAll, 1000);
    }
}

function renderAll() {
    for (toUpdate = 0; toUpdate<dynamicElements.length; toUpdate++) {
        elementToRender = dynamicElements[toUpdate];
        render(elementToRender);
    }
}

function createDomPart(part) {
    var partType = part.getAttribute('type');
    switch (partType) {
        case 'image': return createImageElement(part);
        case 'text':  return createTextElement(part);
        default: console.log('Unknown part type');
    }

    return null;
   // var partMetaType = getPartMetaType(part);
}

function createImageElement(part) {
    var imageDomElement = document.createElement('IMG');
    var imageUrl = getImageUrl(part);
    var imagePartId = getPartMeta(part, 'id');
    var imagePartType = getPartMeta(part, 'type');

    imageDomElement.setAttribute('id', imagePartId);
//    imageDomElement.setAttribute('src', imageBaseUrl+imageUrl);//getDataUri(name, "data:image/png;base64,")
    imageDomElement.setAttribute('src', getDataUri(imageBaseUrl+imageUrl, "data:image/png;base64,"));//
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

function getImageUrl(part) {
    var imageNode = part.getElementsByTagName("image")[0];
    var imageUrl = imageNode.textContent;

    return imageUrl;
}

function createTextElement(part) {
    return null;
}

function createDomElement(group) {
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

function createRender(metaType, data, obId) {
    ob = null;
    switch (metaType) {
        case 'hands':
            var ob = new Hands(data, obId);
        case 'digitalclock':
        case 'background':
        case 'static':
        default:

    }

    return ob;
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
    this.objectId = obId;
    this.dataSource = rotation.getAttribute('source');
    this.valueOffset = valueStart;
    this.angleOffset = angleStart;
    this.degreesPerValueUnit = angleRange/valueRange;
    this.smooth = (smoothSeconds == 'sweep60s');
}

function render(that) {
    var value = valueFromSource(that.dataSource)-that.valueOffset;
    var angle = (that.degreesPerValueUnit * value)+that.angleOffset;
    var renderElement = document.getElementById(that.objectId);
    if (renderElement) {
        //console.log(that.objectId + angle);
        renderElement.style.transform = 'rotate('+angle+'deg)';
    }
}


// todo move to desktop.js
// todo nake version in watch.js
function valueFromSource(source) {
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
        case 'second':
            return seconds;
        case 'second.millisecond':
            return seconds + (miliSeconds/1000) + hours * 3600 + minutes * 60;
        case 'month':
            return 1+ d.getMonth();
        case 'day':
            return d.getDay();
        default: return 0;
    }
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
