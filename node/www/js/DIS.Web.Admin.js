'use strict';

/**
 * DIS.Web.Admin 네임스페이스
 * @class DIS.Web.Admin
 */
DIS.Web.Admin = DIS.Web.Admin || {};

/**
 * DIS.Web.Admin 클래스를 참조하는 글로벌 멤버 변수
 * @interface Admin
 */
var admin = DIS.Web.Admin;
admin = {
    reqList: function () {
        var result = '';
        var resultStr = '';
        $.ajax({
            method: "get",
            url: "/api/signup/request",
            async: false,
            success: function (data) {
                result = data;
                // alert(data[0].cctv_ip)
            }, // success 
            error: function (xhr, status) {
                // alert(xhr + " : " + status);
            },
        });

        for (var i = 0; i < result.length; i++) {
            resultStr += "<div class='reqContent'>\
                <div class='num_content'><p>"+ result[i].id + "</p></div>\
                <div class='company_content'><p>"+ result[i].company_name + "</p></div>\
                <div class='email_content'><p>"+ result[i].account_name + "</p></div>\
                <div class='user_content'><p>"+ result[i].owner_name + "</p></div>\
                <div class='phone_content'><p>"+ result[i].telephone + "</p></div>\
                <div class='yes_content'>\
                    <div class='yesBtn' value="+ result[i].id + ">\
                        <p>승인</p>\
                    </div>\
                </div>\
                <div class='no_content'>\
                    <div class='noBtn' value="+ result[i].id + ">\
                        <p>비승인</p>\
                    </div>\
                </div>\
            </div>"
        }

        return resultStr
    },

    managerList: function () {
        let result = '';
        var resultStr = '';
        $.ajax({
            method: "get",
            url: "/api/manager",
            async: false,
            success: function (data) {
                result = data.result;
                console.log(data);
                // alert(data[0].cctv_ip)
            }, // success 
            error: function (xhr, status) {
                // alert(xhr + " : " + status);
            },
        });

        let curUserAccount = comm.getUserAccount();

        for (var i = 0; i < result.length; i++) {
            let isLock = (result[i].is_lock === 0) ? 'X' : 'O'
            let last_login = (result[i].last_login !== null) ? moment(result[i].last_login).format('YYYY-MM-DD HH:mm:ss') : '기록없음'
            let password_date = moment().diff(moment(result[i].password_date), "days");
            resultStr += `<div class='reqContent'>\
                <div class='num_content'><p>${result[i].id}</p></div>\
                <div class='company_content'><p>${result[i].user_name}</p></div>\
                <div class='email_content'><p>${result[i].account_name}</p></div>\
                <div class='lastlogin_content'><p>${last_login}</p></div>\
                <div class='password-date_content'><p>${password_date}일</p></div>\
                <div class='lock_content'><p>${isLock}</p></div>\
                <div class='password_content'>\
                    <div class='Btn' value=${result[i].id}>\
                        <p>재설정</p>\
                    </div>\
                </div>`;

            if (isLock === 'X') resultStr +=
                `<div class='unlock_content'>\
                    <div class='Btn no'}>\
                        <p>잠금 해제</p>\
                    </div>\
                </div>`
            else if (isLock === 'O') resultStr +=
                `<div class='unlock_content'>\
                <div class='Btn yes' value=${result[i].id}>\
                    <p>잠금 해제</p>\
                </div>\
            </div>`

            if (curUserAccount === 'admin') {
                if (result[i].user_name === 'MHNCity') {
                    resultStr +=
                        `
                        <div class='no_content'>\
                            <div class='' value=${result[i].id}>\
                                    <p></p>\
                            </div>\
                        </div>\
                    </div>
                    `
                }
                else {
                    resultStr +=
                        `
                        <div class='delete_content'>\
                            <div class='Btn no' value=${result[i].id}>\
                                <p>삭제</p>\
                            </div>\
                        </div>\
                    </div>
                    `
                }
            }
            else {
                resultStr +=
                    `
                        <div class='no_content'>\
                            <div class='' value=${result[i].id}>\
                                    <p></p>\
                            </div>\
                        </div>\
                    </div>
                    `
            }
        }

        return resultStr
    },

    accept: function (requestIndex) {
        var result = false;
        var tenantId = null;
        $.ajax({
            method: "post",
            url: "/api/signup/accept",
            data: {
                requestIndex
            },
            async: false,
            success: function (data) {
                if (data.message == 'success') {
                    result = true;
                    tenantId = data.tenantId;
                }
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });
        return [result, tenantId];
    },

    reject: function (requestIndex) {
        var result = false;
        $.ajax({
            method: "post",
            url: "/api/signup/reject",
            data: {
                requestIndex
            },
            async: false,
            success: function (data) {
                result = true;
                console.log(JSON.stringify(data));
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });
        return result;
    },

    getDBInstanceNo: function () {
        let result = null;
        $.ajax({
            method: "get",
            url: "/api/database/instanceNumber",
            async: false,
            success: function (data) {
                if(data.message === 'success') {
                    result = data.result;
                }
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });

        return result;
    },

    createDatabase: function (tenantId) {
        $.ajax({
            method: "get",
            url: "/api/database/instanceNumber",
            success: function (data) {
                if (data.message == 'success') {
                    var cloudMysqlInstanceNo = data.result;
                    var parameter = cloudMysqlInstanceNo + '/' + tenantId;
                    $.ajax({
                        method: "get",
                        url: "/api/createDatabase/" + parameter,
                        success: function (data) {
                            console.log(JSON.stringify(data));
                            $.ajax({
                                method: "get",
                                url: "/api/createTable/" + tenantId,
                                success: function (data) {
                                    console.log(JSON.stringify(data));
                                }, // success 
                                error: function (xhr, status) {
                                    alert(xhr + " : " + status);
                                },
                            });
                        }, // success 
                        error: function (xhr, status) {
                            alert(xhr + " : " + status);
                        },
                    });
                }
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });
    },

    createBucket: function (tenantId) {
        $.ajax({
            method: "POST",
            url: "/api/bucket",
            data: {
                tenantId
            },
            success: function (data) {
                console.log(data);
            }, // success 
            error: function (xhr, status) {
                alert(JSON.stringify(xhr) + " : " + JSON.stringify(status));
            },
        });
    },

    initPassword: function (idx) {
        Swal.fire({
            title: '비밀번호 초기화',
            input: 'password',
            inputLabel: '관리자 비밀번호를 초기화합니다.',
            inputPlaceholder: '새 비밀번호를 입력해 주세요',
            inputAttributes: {
                autocaptialize: 'on',
                minlength: 8,
                maxlength: 20,
            },
            showCancelButton: true,
            inputValidator: (value) => {
                if (!patterns.regExp.test(value)
                    || !patterns.number.test(value)
                    || !patterns.upperCase.test(value)
                    || !patterns.lowerCase.test(value)
                )
                    return '비밀번호 형식 오류'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const password = result.value;

                $.ajax({
                    method: "post",
                    url: "/api/manager/init-password",
                    data: {
                        user_id: idx,
                        password: password
                    },
                    success: function (data) {
                        if (data.message === 'success') {
                            Swal.fire({
                                title: '비밀번호 초기화 완료',
                                showCancelButton: false,
                                confirmButtonText: '확인',
                                icon: 'success',
                                allowOutsideClick: false,
                            }).then(() => {
                                location.reload();
                            })
                        }
                    }, // success 
                    error: function (xhr, status) {
                        alert(xhr + " : " + status);
                    },
                });
            }
        })
    },

    unlockManager: function (idx) {
        Swal.fire({
            title: '관리자 계정 로그인 잠금 해제',
            html: '로그인 5회 이상 실패한 계정입니다.<br>잠금을 해제하시겠습니까?',
            showCancelButton: true,
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    method: "post",
                    url: "/api/manager/unlock",
                    data: {
                        user_id: idx,
                    },
                    success: function (data) {
                        if (data.message === 'success') {
                            Swal.fire({
                                title: '계정 잠금 해제 완료',
                                showCancelButton: false,
                                confirmButtonText: '확인',
                                icon: 'success',
                                allowOutsideClick: false,
                            }).then(() => {
                                location.reload();
                            })
                        }
                    }, // success 
                    error: function (xhr, status) {
                        alert(xhr + " : " + status);
                    },
                });
            }
        })
    },

    createManagerBtn: function () {
        let html = `
        <div class="subHeader">
            <div class="sub_add">
                <p>관리자 계정 생성</p>
            </div>
        </div>
        `;

        $('.sub_content')[0].innerHTML = html;
    },

    authentication: function (execute) {
        execute = execute || function () { return null };
        Swal.fire({
            title: '2차 인증',
            input: 'password',
            inputLabel: '2차 인증을 진행해 주세요.',
            inputPlaceholder: '비밀번호',
            showCancelButton: true,
            showLoaderOnConfirm: true,
            preConfirm: async function (password) {
                let account_name = await comm.getUserAccount();
                return fetch('/api/auth/passwordCheck', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        account_name: account_name,
                        password: password
                    })
                })
            },
            allowOutsideClick: () => !Swal.isLoading(),
            backdrop: true
        }).then((result) => {
            if (result.isConfirmed) {
                if (result.value.status === 200) {
                    execute()
                }
                else {
                    Swal.fire({
                        icon: 'error',
                        title: '비밀번호 불일치',
                        html: '2차 인증에 실패하였습니다.',
                        showConfirmButton: false,
                        timer: 800
                    }).then(() => location.href = '/admin_manage')
                }
            }
            else location.href = '/admin_manage'
        })
    },

    createManager: function () {
        let accountInfo = {
            account_name: $(".sub_id").val(),
            password: $(".sub_password").val(),
            repassword: $(".sub_repassword").val(),
            user_name: $(".sub_username").val(),
            email: $(".sub_email").val()
        }

        let fulfilled = true;
        let validated = true;

        let validate = {
            account_name: true,
            password: true,
            repassword: true,
            user_name: true,
            email: true
        };

        let errorMsg = {
            account_name: '계정명 오류',
            password: '비밀번호 오류',
            repassword: '비밀번호 확인 오류',
            user_name: '사용자 이름 오류',
            email: '이메일 오류'
        }

        for (let key in accountInfo) {
            const value = accountInfo[key]
            if (value === '') fulfilled = false;
            if (key === 'email') {
                if (!patterns.email.test(value)) {
                    validate.email = false;
                    validated = false;
                }
            }
            if (key === 'password' || key === 'repassword') {
                if (
                    !patterns.regExp.test(value) ||
                    !patterns.number.test(value) ||
                    !patterns.upperCase.test(value) ||
                    !patterns.lowerCase.test(value)
                ) {
                    validate[key] = false;
                    validated = false;
                }
            }
        }

        if (fulfilled) {
            if (!validated) {
                let msg = ''
                for (let key in validate) {
                    if (validate[key] === false) {
                        msg += `${errorMsg[key]}<br>`
                    }
                }
                Swal.fire({
                    title: '형식에 맞지 않는 정보 입력',
                    html: msg,
                    showConfirmButton: false,
                    showDenyButton: true,
                    denyButtonText: "확 인",
                    icon: "error"
                })
            }
            else if (accountInfo.password !== accountInfo.repassword) {
                Swal.fire({
                    title: '형식에 맞지 않는 정보 입력',
                    html: '비밀번호 불일치',
                    showConfirmButton: false,
                    showDenyButton: true,
                    denyButtonText: "확 인",
                    icon: "error"
                })
            }
            else {
                Swal.fire({
                    title: '관리자 계정 생성',
                    html: '입력한 정보로 관리자 계정을 생성합니다',
                    showCancelButton: false,
                    showLoaderOnConfirm: true,
                    preConfirm: () => {
                        return fetch('/api/manager', {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(accountInfo)
                        })
                    }
                }).then((result) => {
                    if (result.value.status === 200) {
                        Swal.fire({
                            icon: 'success',
                            title: '관리자 계정 생성 완료',
                            showConfirmButton: false,
                            timer: 1000
                        }).then(() => location.href = '/admin_manage')
                    }
                    else {
                        Swal.fire({
                            title: '에러 발생',
                            html: '계정 생성 실패',
                        })
                    }
                })
            }
        }
        else {
            Swal.fire({
                title: '빈 칸에 정보를 입력해주세요.',
                showConfirmButton: false,
                showDenyButton: true,
                denyButtonText: "확 인",
                icon: "error"
            })
        }
    },

    deleteManager: function (idx) {
        Swal.fire({
            title: '관리자 계정 삭제',
            html: '선택한 계정을 삭제하시겠습니까?',
            showCancelButton: true,
        }).then((result) => {
            if (result.isConfirmed) {
                function execute() {
                    Swal.fire({
                        title: '비밀번호 확인 완료',
                        html: '선택한 계정을 삭제합니다',
                        showCancelButton: false,
                        showLoaderOnConfirm: true,
                        preConfirm: () => {
                            return fetch('/api/manager', {
                                method: "DELETE",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    user_id: idx,
                                })
                            })
                        }
                    }).then((result) => {
                        if (result.value.status === 200) {
                            Swal.fire({
                                icon: 'success',
                                title: '관리자 계정 삭제 완료',
                                showConfirmButton: false,
                                timer: 1000
                            }).then(() => location.reload())
                        }
                        else {
                            Swal.fire({
                                title: '에러 발생',
                                html: '계정 삭제 실패',
                            }).then(() => location.reload())
                        }
                    })
                }
                admin.authentication(execute);
            }
        })
    }
}