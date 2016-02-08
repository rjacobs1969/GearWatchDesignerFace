/**
 * Created by robin.jacobs on 26/01/16.
 */

function overwriteBaseDivPositions()
{
    return false;
}

function touchOrClickEvent()
{
    return 'onclick';
}

/** Load all js needed */
(function( loader, $, undefined ) {
    var urls = [];

    loader.adds = function(url) {
        urls.push(url);
    };

    loader.add= function(url) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        script.async = false; // execute scripts in order
        head.appendChild(script);
    };

    loader.load = function() {
        if (typeof jQuery == 'undefined') {
            //console.log('must load jquery');
            loader.add("js/jquery-1.8.3.min.js"); // jQuery is not loaded
        }
        loader.add("js/jszip.js");
        loader.add("js/jszip-utils.js");
        loader.add("js/FileSaver.js");
        loader.add("js/stringview.js");
        loader.add("js/cldrjs/dist/cldr.js");
        loader.add("js/cldrjs/dist/cldr/event.js");
        loader.add("js/cldrjs/dist/cldr/supplemental.js");
        loader.add("js/globalize/globalize.js");
        loader.add("js/globalize/globalize/message.js");
        loader.add("js/globalize/globalize/number.js");
        loader.add("js/globalize/globalize/plural.js");
        loader.add("js/globalize/globalize/date.js");
        loader.add("js/globalize/globalize/currency.js");
        loader.add("js/globalize/globalize/relative-time.js");
        loader.add("js/globalize/globalize/unit.js");
        loader.add("js/settings.js");
        loader.add("js/xmlParser.js");
        loader.add("js/GWDProjectFileReader.js");
        loader.add("js/init.js");
    };

    loader.load();
}( window.loader = window.loader || {}));


