/**
 * Created by robin.jacobs on 07/02/16.
 */

/** file selector button **/
(function () {
    $("#file").on("change", function (evt) {
        var files = evt.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            //gearWatch.init();
            processZipFile(f);
        }
    });
})();
