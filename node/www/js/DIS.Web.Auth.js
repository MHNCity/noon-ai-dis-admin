'use strict';

/**
 * DIS.Web.Auth 네임스페이스
 * @class DIS.Web.Auth
 */
DIS.Web.Auth = DIS.Web.Auth || {};

/**
 * DIS.Web.Auth 클래스를 참조하는 글로벌 멤버 변수
 * @interface Auth
 */
var auth = DIS.Web.Auth;
auth = {
    test: function() {
        $.ajax({
            method: "get",
            url: '/api/auth/test',
            async: false,
            success: function (data) {
                console.log(data)
                console.log(typeof(data.loginable))
            },
            error: function (xhr, status) {
                console.log(xhr);
            }
        })
    },

    secondaryEmailSend: function (email) {
        let result ='';
        $.ajax({
            method: "post",
            url: '/api/auth/secondary-email-send',
            data: {
                email
            },
            xhrFields: {
                withCredentials: true
            },
            async: false,
            success: function (data) {
                if(data.message == 'success'){
                    result = data.verifyCode;
                    Swal.fire({
                        title: '인증번호 발송 완료',
                        text: '등록되어 있는 이메일 주소로 인증번호가 발송되었습니다.',
                        confirmButtonText: '확 인',
                        allowOutsideClick: false,
                        icon: 'success'
                    })
                } else {
                    alert("secondary email send failed.");
                }
            },
            error: function (xhr, status) {
                // alert("error : " + JSON.stringify(xhr) + " : " + JSON.stringify(status));
            }
        })

        return result;
    },

    firstLogin: function (account_name, password) {
        let postdata = { account_name: account_name, password: password };
        $.ajax({
            method: "post",
            url: '/api/auth/first-login',
            data: postdata,
            xhrFields: {
                withCredentials: true
            },
            async: false,
            success: function (data) {
                if(data.message=="password over 90days"){
                    $("#passwordModal").addClass('active')
                }
                else{
                    let lockStatus = null;
                    let loginable = false;
                    let activateTime = null;
    
                    lockStatus = auth.selectLockStatus(account_name);
                    loginable = lockStatus.loginable
                    activateTime = lockStatus.activateTime
                    
                    if(loginable) {
                        $(".auth_id").val(data.admin_email);
                        $("#authModal").addClass('active');   
                    }
                    else {
                        Swal.fire({
                            title: '계정 로그인 비활성화',
                            text: `5회 이상 로그인에 실패하였습니다.\n ${activateTime} 이후 다시 시도해 주세요.`, 
                            showConfirmButton: false,
                            showDenyButton: true,
                            denyButtonText: "확 인",
                            icon: "error"
                        });
                    }
                }
            },
            error: function (xhr, status) {
                let loginFailCount = 0;

                if(account_name !== 'admin') {
                    loginFailCount = auth.plusLoginFailCount(account_name);
                    let lock_count = Math.floor(loginFailCount / 5)
                    if(loginFailCount >= 5) auth.updateLockStatus(account_name, lock_count);
                }

                Swal.fire({
                    title: '로그인에 실패하였습니다.',
                    showConfirmButton: false,
                    showDenyButton: true,
                    denyButtonText: "확 인",
                    icon: "error"
                });
            }
        })
    },

    login: function (account_name, password) {
        var postdata = { account_name: account_name, password: password };
        $.ajax({
            method: "post",
            url: "/api/auth/login",
            data: postdata,
            success: function (data) {
                console.log(JSON.stringify(data));
                location.href = '/join';
            }, // success 
            error: function (xhr, status) {
                // alert("error : " + xhr + " : " + JSON.stringify(status));
                Swal.fire('로그인에 실패하였습니다.', '', 'error');
            }
        })
    },

    passwordChange: function (account_name, now_password, new_password) {

        $.ajax({
            method: "post",
            url: '/api/auth/password-change',
            data: {
                account_name,
                now_password,
                new_password
            },
            success: function (data) {
                Swal.fire({
                    title: '비밀번호 변경이 완료되었습니다.',
                    showConfirmButton: true,
                    showDenyButton: false,
                    confirmButtonText: "확 인",
                    icon: "success"
                }).then(() => {
                    location.reload();
                })
            }, // success 
            error: function (xhr, status) {
                let message = xhr.responseJSON.message;
                if (message == 'ID not found') {
                    Swal.fire({
                        title: '존재하지 않는 아이디입니다.',
                        showConfirmButton: false,
                        showDenyButton: true,
                        denyButtonText: "확 인",
                        icon: "error"
                    })
                }
                else if (message == 'user_input_not_match') {
                    Swal.fire({
                        title: '현재 비밀번호가 일치하지 않습니다.',
                        showConfirmButton: false,
                        showDenyButton: true,
                        denyButtonText: "확 인",
                        icon: "error"
                    })
                }
            }
        })
    },

    logout: function () {
        $.ajax({
            method: "get",
            url: "/api/auth/logout",
            success: function (data) {
                location.href = '/';
            }, // success 
            error: function (xhr, status) {
                alert("error : " + JSON.stringify(xhr) + " : " + JSON.stringify(status));
            }
        })
    },

    selectLockStatus: function (account_name) {
        let result = false;
        $.ajax({
            method: "post",
            url: "/api/auth/selectLockStatus",
            data: {
                "account_name": account_name,
            },
            async: false,
            success: function (data) {
                result = data
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });

        return result;
    },

    plusLoginFailCount: function (account_name) {
        let result = 0;
        $.ajax({
            method: "put",
            url: "/api/auth/failCount/plus",
            data: {
                "account_name": account_name,
            },
            async: false,
            success: function (data) {
                result = data.login_fail_count;
            }, // success 
            error: function (xhr, status) {
                
            },
        });

        return result;
    },

    updateLockStatus: function (account_name, lock_count) {
        $.ajax({
            method: "put",
            url: "/api/auth/lockStatus",
            data: {
                "account_name": account_name,
                "lock_count": lock_count,
            },
            async: false,
            success: function (data) {
                
            }, // success 
            error: function (xhr, status) {
                
            },
        });
    },

    updateClearLoginFailCount: function (account_name) {
        $.ajax({
            method: "put",
            url: "/api/auth/failCount/clear",
            data: {
                "account_name": account_name,
            },
            async: false,
            success: function (data) {
                
            }, // success 
            error: function (xhr, status) {
                
            },
        });
    },

    updateClearLockCount: function (account_name) {
        $.ajax({
            method: "put",
            url: "/api/auth/lockCount/clear",
            data: {
                "account_name": account_name,
            },
            async: false,
            success: function (data) {
                
            }, // success 
            error: function (xhr, status) {
                
            },
        });
    },
}