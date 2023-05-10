$(document).ready(function () {
    $('.restore').click(function () {
        if($('input[name=restoration]:checked').val()=="true"){
            $('.restoreKey').addClass('on')
        }
        else{
            $('.restoreKey').removeClass('on')
            $('.selectKey').removeClass('on')
            $('.createKey').removeClass('on')
            $('input[name=keySelect]:checked').prop('checked', false)
        }
    })

    $('.keySelect').click(function () {
        if($('input[name=keySelect]:checked').val()=='skey'){
            $('.selectKey').addClass('on')
            $('.createKey').removeClass('on')
        }
        else{
            $('.selectKey').removeClass('on')
            $('.createKey').addClass('on')
        }
    })

    $(document).on("click", ".allface", function () {
        if($('.allface').is(":checked")){
            $("input:checkbox[class=face]").prop("checked", true);
        }
        else{
            $('input[class=face]:checked').prop('checked', false)
        }
    });

    $(document).on("click", ".allbody", function () {
        if($('.allbody').is(":checked")){
            $("input:checkbox[class=body]").prop("checked", true);
        }
        else{
            $('input[class=body]:checked').prop('checked', false)
        }
    });

    $(document).on("click", ".allcar", function () {
        if($('.allcar').is(":checked")){
            $("input:checkbox[class=car]").prop("checked", true);
        }
        else{
            $('input[class=car]:checked').prop('checked', false)
        }
    });

    $(document).on("click", ".face", function () {
        if(!$(this).is(":checked")){
            $("input:checkbox[class=allface]").prop("checked",false);
        }
    });

    $(document).on("click", ".body", function () {
        if(!$(this).is(":checked")){
            $("input:checkbox[class=allbody]").prop("checked",false);
        }
    });

    $(document).on("click", ".car", function () {
        if(!$(this).is(":checked")){
            $("input:checkbox[class=allcar]").prop("checked",false);
        }
    });

    $(document).on("click", ".keySelect", function () {
        $('.selectText').text("Key 선택하기")
        $('.selectKey').data("idx", "")
        $("#genKeyName").val("")
    });

    $(document).on("click", ".selectKey", function () {
        if($('#selectKeyName').hasClass("active")){
            $('#selectKeyName').removeClass('active')
            $(".select_img").css('transform','rotate(0deg)');
        }
        else{
            $('#selectKeyName').addClass('active')
            $(".select_img").css('transform','rotate(-180deg)');
        }
    });

    $(document).on("click", ".dropdown_content", function () {
        var keyIndex = $(this).data("idx")
        var keyName = $(this).children().text()
        $('.selectText').text(keyName)
        $('.selectKey').data("idx", keyIndex)
        console.log($('.selectKey').data("idx"))
    });

    // $(document).on("click", ".logo", function () {
    //     location.href = "/main"
    // });

    $(document).on("click", ".upBtn", function () {
        var offset = $('body').offset();
        $('html').animate({scrollTop : offset.top}, 400);
    });

    $(document).ready(function() {
        // var auth = comm.adminonly();
        // if(auth == "master"){
        //     $(".admin_only").removeClass('hide')
        // }
        // else if(auth == "sub"){
        //     $(".admin_only").addClass('hide')
        // }
    });

    $(document).on("click", ".chargeBtn", function () {
        $("#chargeModal").addClass('active')
    });

    $(document).on("click", ".body_allselect", function () {
        // console.log($(this).val())
        var num = $(this).attr('class')[$(this).attr('class').length - 1]
        if($(this).is(":checked")){
            $(".check_body."+num+"").prop("checked", true);
        }
        else{
            $(".check_body."+num+"").prop('checked', false)
        }
        $(".selectText.body."+num+"").text($(".check_body."+num+":checked").length);
    })

    $(document).on("click", ".head_allselect", function () {
        // console.log($(this).val())
        var num = $(this).attr('class')[$(this).attr('class').length - 1]
        if($(this).is(":checked")){
            $(".check_head."+num+"").prop("checked", true);
        }
        else{
            $(".check_head."+num+"").prop('checked', false)
        }
        $(".selectText.head."+num+"").text($(".check_head."+num+":checked").length);
    })

    $(document).on("click", ".lp_allselect", function () {
        // console.log($(this).val())
        var num = $(this).attr('class')[$(this).attr('class').length - 1]
        if($(this).is(":checked")){
            $(".check_lp."+num+"").prop("checked", true);
        }
        else{
            $(".check_lp."+num+"").prop('checked', false)
        }
        $(".selectText.lp."+num+"").text($(".check_lp."+num+":checked").length);
    })

    $(document).on("click", ".check_body", function () {
        var num = $(this).attr('class')[$(this).attr('class').length - 1]
        if(!$(this).is(":checked")){
            $(".body_allselect."+num+"").prop("checked",false);
        }
    });

    $(document).on("click", ".check_head", function () {
        var num = $(this).attr('class')[$(this).attr('class').length - 1]
        if(!$(this).is(":checked")){
            $(".head_allselect."+num+"").prop("checked",false);
        }
    });

    $(document).on("click", ".check_lp", function () {
        var num = $(this).attr('class')[$(this).attr('class').length - 1]
        if(!$(this).is(":checked")){
            $(".lp_allselect."+num+"").prop("checked",false);
        }
    });

    $(document).on("click", ".crop_inner", function () {
        $('#cropView').removeClass('active')
    });
});