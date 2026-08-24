/*
 * Session Control
 */ 

var checkSessionLastCheck = false;
var secondsSinceLastCheck = 0;
function checkSession(mode)
{
    // We can skip loop mode if there has been less than 5 minutes since last check
    if (checkSessionLastCheck) {
        var now  = new Date();
        var ts   = now.getTime();
        var diff = ts - checkSessionLastCheck.getTime();
        secondsSinceLastCheck = diff / 1000;
    }

    if (mode == 'forced' || 
        !checkSessionLastCheck || 
        secondsSinceLastCheck > sessionUpdateSecs) 
    {
        checkSessionLastCheck = new Date();
        $.ajax({
            url: 'pages/session-update.php',
            cache: false,
            success: function(response) 
            {
                if (response.success == 0) {
                    // EDITOR / TEACHERS INTERFACE: Session has expired
                    if ( $('#modal-session-expired').length != 0 ) {
                        $('#modal-session-expired').modal('show');
                    } 
                    // SCHOOL
                    else if ($('a[href="user?logout=1"]').length != 0) {
                        window.location = 'user?logout=1';
                    } 
                }
            }
        });
    }
}

$(document).ready(function()
{
    $('#session-expired').on('click', function(e) {
        e.preventDefault();
        $('#modal-session-expired').modal('hide'); 
        if ($('#modal-login').length != 0) {
            $('#modal-login').modal('show');
        } else {
            window.location.href = window.location.href;
        }
    });
    // Update every sessionUpdateSecs seconds, only if Session Cookie present and page is Active
    setInterval(function () {
        checkSession('loop');
    }, sessionUpdateSecs*1000);

    ifvisible.on('statusChanged', function(e) {
        // Do not check when page is loaded (checkSessionLastCheck is FALSE), 
        // but when gets focus time after the page load
        if (e.status == 'active' && checkSessionLastCheck) {
            checkSession('forced');
        }
    });

    // Set timezone offset in $_SESSION
    if( $('#tzoffset').val() == 'new' )
    {
        var tzOffset = new Date().getTimezoneOffset();
        $('#tzoffset').val( tzOffset );

        $.ajax({
            url: 'pages/session-update.php?tzo='+tzOffset,
            cache: false
        });
    }

});