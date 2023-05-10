'use strict';

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

DIS.Web.Init = DIS.Web.Init || {};
var modiidx = null;
var init = DIS.Web.Init;
init = {

    // 유저 로그인 화면 제어
    index: function () {
        // auth.test();
        var env = comm.getEnv().toUpperCase();

        $('#env')[0].innerHTML = `${env} Admin`
        $(document).on("click", "#loginButton", async function () {
            var accountName = $("#name").val();
            var password = $("#pass").val();
            if (accountName && password) {
                auth.firstLogin(accountName, password);
            }
            else {
                if (accountName == '') var msg = '아이디';
                if (password == '') var msg = '비밀번호';
                if (accountName == '' && password == '') var msg = '아이디와 비밀번호';
                Swal.fire(msg + '를 입력해 주세요.', '', 'warning');
            }
        });

        let verifyCode = null;
        $(document).on("click", "#email_send", function () {
            let email = $(".auth_id").val();
            verifyCode = auth.secondaryEmailSend(email);
        });

        $(document).on("click", ".auth_confirm", function () {
            let user_code = $("#user_input_code").val();
            if (env === 'DEV') {
                let accountName = $("#name").val();
                let password = $("#pass").val();
                auth.login(accountName, password);
                auth.updateClearLoginFailCount(accountName);
                auth.updateClearLockCount(accountName);
            }
            else {
                if (verifyCode == user_code) {
                    let accountName = $("#name").val();
                    let password = $("#pass").val();
                    auth.login(accountName, password);
                } else {
                    Swal.fire({
                        title: "2차 인증에 실패했습니다.",
                        showConfirmButton: false,
                        showDenyButton: true,
                        denyButtonText: "확 인",
                        icon: "error"
                    });
                }
            }
        });
    },

    join: function () {
        var reqList = admin.reqList();
        $(".reqBody").html(reqList);

        $(document).on("click", ".yesBtn", function () {
            var signupReqIdx = $(this).attr('value')

            Swal.fire({
                title: '해당 요청을 승인하시겠습니까?',
                showCancelButton: true,
                confirmButtonText: '네',
                cancelButtonText: '취소'
            }).then((result) => {
                if (result.isConfirmed) {
                    new Promise((resolve, reject) => {
                        var result = false;
                        var tenantId = null;
                        [result, tenantId] = admin.accept(signupReqIdx);
                        console.log(result)
                        console.log(tenantId)
                        resolve({ result, tenantId });
                    }).then(({ result, tenantId }) => {
                        admin.createDatabase(tenantId);
                        admin.createBucket(tenantId);
                        if (result) Swal.fire('가입 요청이 허가되었습니다.', '', 'success').then(() => {
                            // location.reload();
                        })
                        else Swal.fire(
                            '처리가 완료되지 않았습니다.',
                            '다시 시도해 주세요.',
                            'error'
                        )
                    })
                }
            })
        });

        $(document).on("click", ".noBtn", function () {
            var signupReqIdx = $(this).attr('value')

            Swal.fire({
                title: '해당 요청을 삭제하시겠습니까?',
                showCancelButton: true,
                confirmButtonText: '네',
                cancelButtonText: '취소'
            }).then((result) => {
                if (result.isConfirmed) {
                    var result = admin.reject(signupReqIdx);
                    if (result) Swal.fire('가입 요청이 삭제되었습니다.', '', 'success').then(() => {
                        location.reload();
                    })
                    else Swal.fire(
                        '처리가 완료되지 않았습니다.',
                        '다시 시도해 주세요.',
                        'error'
                    )
                }
            })
        });
    },

    quit: function () {
        var html = tenant.getTenantList();
        $(".reqBody").html(html);

        $(document).on("click", ".noBtn", function () {
            var tenantId = $(this).attr('value')

            const isDatabaseExist = ($(this).attr('database') === 'O') ? true : false;
            const isBucketExist = ($(this).attr('bucket') === 'O') ? true : false;

            Swal.fire({
                title: '해당 테넌트의 탈퇴를\n 진행하시겠습니까?',
                showCancelButton: true,
                confirmButtonText: '네',
                cancelButtonText: '취소'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    let databaseDeleted, bucketDeleted, accountDeleted = null;
                    if (isDatabaseExist) databaseDeleted = await tenant.deleteDatabase(tenantId);
                    if (isBucketExist) bucketDeleted = await tenant.deleteBucket(tenantId);

                    let msg = '';
                    let icon = '';
                    if (databaseDeleted || bucketDeleted) {
                        if (databaseDeleted) msg += `데이터베이스 삭제 성공<br>`
                        if (bucketDeleted) msg += `버킷 삭제 성공<br>`
                    }
                    else msg += `자원이 이미 삭제되었습니다.`

                    Swal.fire({
                        title: '할당된 자원 삭제 완료',
                        html: msg,
                        icon: icon,
                        allowOutsideClick: false
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            accountDeleted = await tenant.deleteAccount(tenantId);
                            if (accountDeleted) Swal.fire('이용자 회원 탈퇴가 완료되었습니다.', '', 'success').then(() => {
                                location.reload();
                            })
                            else Swal.fire(
                                '처리가 완료되지 않았습니다.',
                                '다시 시도해 주세요.',
                                'error'
                            ).then(() => location.reload());
                        }
                    })
                }
            })
        });
    },

    usage: function () {
        var d = new Date();
        var sel_month = -1; // 월을 조절하시면 됩니다. -1이면 전달을 +1이면 다음달을..
        d.setMonth(d.getMonth() + sel_month);

        var year = d.getFullYear();
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var searchMonth = year + "-" + month;

        // requestTable.getMonthUsage('2022-10')
        var getMonthUsage = requestTable.getMonthUsage(searchMonth)
        // var getMonthUsage = requestTable.getMonthUsage('2022-10')
        $(".logArea").html(getMonthUsage);

        $(document).on("click", ".search", function () {
            var type = $("input[type=radio][name=search_filter]:checked").val();
            var date = $("#startVal").val();
            if (type = "all_count") {
                var getMonthUsage = requestTable.getMonthUsage(date)
                $(".logArea").html(getMonthUsage);
            }
            else {
                console.log("no all_count")
                // var getLogUsage = requestTable.getLogUsage(type, date)
                // $(".logArea").html(getLogUsage);
            }
        });
    },

    admin_manage: function () {
        let curManager = comm.getUserAccount();
        if (curManager === 'admin') admin.createManagerBtn();
        let managerListHtml = admin.managerList();
        $(".reqBody").html(managerListHtml);

        $(document).on("click", ".password_content .Btn", function () {
            let idx = $(this).attr('value');
            admin.initPassword(idx);
        });

        $(document).on("click", ".unlock_content .Btn.yes", function () {
            let idx = $(this).attr('value');
            admin.unlockManager(idx);
        });

        $(document).on("click", ".delete_content .Btn", function () {
            let idx = $(this).attr('value');
            admin.deleteManager(idx);
        });

        $(document).on("click", ".sub_add", function () {
            location.href = '/admin_account'
        });
    },

    admin_account: function () {
        let curManager = comm.getUserAccount();
        if (curManager !== 'admin') location.href = '/admin_manage';
        admin.authentication();

        $(document).on("click", ".addSave", function () {
            console.log('1')
            admin.createManager();
        });
    },
};

$(document).ready(function () {
    var url = document.location.href;
    var len = url.split('/').length;
    var pageName = url.split('/')[len - 1];
    pageName = pageName.split('#')[0]
    pageName = pageName.split('?')[0]
    if (pageName == '') {
        init['index']();
    } else {
        init[pageName]();
    }
});