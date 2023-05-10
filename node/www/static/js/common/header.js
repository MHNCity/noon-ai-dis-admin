$(document).ready(function () {
    var loginUser = comm.getUser()
    $(".login_user").html(loginUser);

    $(document).on("click", ".menuBtn", function () {
        if($('.dropdown-content').hasClass('on')){
            $('.dropdown-content').removeClass('on')
        }
        else{ 
            $('.dropdown-content').addClass('on')
        }
    })
    
    // document.addEventListener('mouseup', function(e) {
    //     if($('.dropdown-content').hasClass('on')){
    //         var container = document.getElementById('myDropdown');
    //         if (!container.contains(e.target)) {
    //             $('.dropdown-content').removeClass('on')
    //         }
    //     }
    // });

    $(document).on("click", ".infoMove", function () {
        $("#saveConfir").addClass('active')
        $("#saveConfir").find('[autofocus]').focus();
    });


    $("#saveConfir").keypress(function (e) {
        if (e.keyCode == 13) {
            $(".infoConfir").click();
        }
    });

    $(document).on("click", ".cancel", function () {
        $('.modal').removeClass('active')
        $('.cur_password').val("")
    });

    $(document).on("click", ".infoConfir", function () {
        // location.href="/myinfo"
        var cur_password = $(".cur_password").val()
        comm.joinInfo(cur_password);
    });

    $(document).on("click", "#logout", function () {
        auth.logout();
    });
});