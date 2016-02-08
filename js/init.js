/**
 * Created by robin.jacobs on 07/02/16.
 */

/** file selector button **/
(function () {
    $("#file").on("change", function (evt) {
        var files = evt.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            //gearWatch.init();
            gearWatchDesignerSettings.processZipFile(f);
        }
    });
})();

/** Multi language **/
$.when(
    $.get( "cldr/main/"+gearWatchDesignerSettings.language+"/ca-gregorian.json" ),
    $.get( "cldr/main/"+gearWatchDesignerSettings.language+"/numbers.json"),
    $.get( "cldr/main/"+gearWatchDesignerSettings.language+"/timeZoneNames.json" ),
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
    gearWatch.setIcuFormatter(Globalize(gearWatchDesignerSettings.language));
});

function logIt(text) {
    if (gearWatchDesignerSettings.debug) {
        console.log(text);
    }
}