'use strict';

/**
 * DIS.Web.Tenant 네임스페이스
 * @class DIS.Web.Tenant
 */
DIS.Web.Tenant = DIS.Web.Tenant || {};

/**
 * DIS.Web.Admin 클래스를 참조하는 글로벌 멤버 변수
 * @interface Tenant
 */
var tenant = DIS.Web.Tenant;
tenant = {
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
        $.ajax({
            method: "get",
            url: "/api/createDatabase/" + tenantId,
            async: false,
            success: function (data) {
                alert(data);
                console.log(JSON.stringify(data));
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });
    },

    deleteDatabase: async function (tenantId) {
        let deleted = false;
        await Swal.fire({
            title: '데이터베이스 삭제',
            html: '선택한 테넌트에 할당된<br>데이터베이스를 삭제합니다',
            showCancelButton: false,
            showLoaderOnConfirm: true,
            preConfirm: () => {
                let cloudMysqlInstanceNo = admin.getDBInstanceNo();
                return fetch('/api/tenant/database', {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "cloudMysqlInstanceNo": cloudMysqlInstanceNo,
                        "tenantId": tenantId
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(response.statusText)
                        }
                        return response.json()
                    })
                    .catch(error => {
                        Swal.showValidationMessage(
                            `Request failed: ${error}`
                        )
                    })
            }
        }).then((result) => {
            if (result.value.message === 'success') deleted = true;
            else Swal.fire('데이터베이스 삭제 실패', '다시 시도해 주세요', 'error')
        })

        return deleted
    },

    deleteBucket: async function (tenantId) {
        let deleted = false;
        await Swal.fire({
            title: '버킷 삭제',
            html: '선택한 테넌트에 할당된<br>버킷을 삭제합니다',
            showCancelButton: false,
            showLoaderOnConfirm: true,
            preConfirm: () => {
                return fetch('/api/tenant/bucket', {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "tenantId": tenantId
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(response.statusText)
                        }
                        return response.json()
                    })
                    .catch(error => {
                        Swal.showValidationMessage(
                            `Request failed: ${error}`
                        )
                    })
            }
        }).then((result) => {
            if (result.value.message === 'success') deleted = true;
            else Swal.fire('버킷 삭제 실패', '다시 시도해 주세요', 'error')
        })
        return deleted;
    },

    deleteAccount: async function (tenantId) {
        let deleted = false;
        let selected = '';
        await Swal.fire({
            title: '계정을 삭제하시겠습니까?',
            input: 'select',
            inputPlaceholder: '탈퇴사유',
            inputOptions: {
                1: '비용이 너무 비싸서', 
                2: '대체 서비스 사용', 
                3: '서비스 불만족', 
                4: '기타'
            },
            html: `선택한 테넌트를<br>데이터베이스에서 삭제합니다`,
            allowOutsideClick: false,
            showCancelButton: true,
            inputValidator: (value) => {
                if(value === '') return '탈퇴사유를 선택해 주세요'
            },
        }).then((result) => {
            if (result.isConfirmed) {
                const reason_code = result.value;
                return fetch('/api/tenant/account', {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "tenantId": tenantId,
                        "reason_code": reason_code,
                        "reason_text": null
                    })
                })
                .then(response => {
                    if(!response.ok) {
                        throw new Error(response.statusText)
                    }
                    return response.json()
                })
                .catch(error => {
                    Swal.showValidationMessage(
                        `Request failed: ${error}`
                    )
                })
            }
        }).then((result) => {
            if (result) {
                if (result.message === 'success') deleted = true;
            }
        })

        return deleted;
    },

    deleteAccount2: async function (tenantId) {
        let deleted = false;
        let selected = '';
        await Swal.fire({
            title: '계정을 삭제하시겠습니까?',
            input: 'select',
            inputPlaceholder: '탈퇴사유',
            inputOptions: {
                1: '비용이 너무 비싸서', 
                2: '대체 서비스 사용', 
                3: '서비스 불만족', 
                4: '기타'
            },
            html: `선택한 테넌트를<br>데이터베이스에서 삭제합니다`,
            allowOutsideClick: false,
            showCancelButton: true,
            inputValidator: (value) => {
                if(value === '') return '탈퇴사유를 선택해 주세요'
            },
        }).then((result) => {
            if (result.isConfirmed) {
                const reason_code = result.value;
                return fetch('/api/tenant/account', {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "tenantId": tenantId,
                        "reason_code": reason_code,
                        "reason_text": null
                    })
                })
                .then(response => {
                    if(!response.ok) {
                        throw new Error(response.statusText)
                    }
                    return response.json()
                })
                .catch(error => {
                    Swal.showValidationMessage(
                        `Request failed: ${error}`
                    )
                })
            }
        }).then((result) => {
            if (result) {
                if (result.message === 'success') deleted = true;
            }
        })

        return deleted;
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

    getBucketList: function () {
        let bucketList = null;
        $.ajax({
            method: "GET",
            url: "/api/bucket/list",
            async: false,
            success: function (data) {
                bucketList = data.result;
            }, // success 
            error: function (xhr, status) {
                alert(JSON.stringify(xhr) + " : " + JSON.stringify(status));
            },
        });

        return bucketList
    },

    getTenantList: function () {
        let env = (comm.getEnv() === 'dev') ? 'dev-' : '';

        var html = '';
        var result = '';
        let databaseList = null;
        let [ Bucket_kr, Bucket_krs ] = tenant.getBucketList();
        console.log(Bucket_kr)
        console.log(Bucket_krs)
        $.ajax({
            method: "get",
            url: "/api/tenant",
            async: false,
            success: function (data) {
                if (data.message == 'success') {
                    result = data.result;
                    console.log(data);
                    databaseList = data.databases;
                }
            }, // success 
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            },
        });


        for (var i = 0; i < result.length; i++) {
            let databaseName = `${env}dis-tenant-${result[i].id}`
            console.log(databaseName)
            let bucketName = `${env}tenant-${result[i].id}`

            let databaseExist = (databaseList.indexOf(databaseName) >= 0) ? 'O' : 'X'
            let kr_BucketExist = (Bucket_kr.indexOf(bucketName) >= 0) ? 'O' : 'X'
            let krs_BucketExist = (Bucket_krs.indexOf(bucketName) >= 0) ? 'O' : 'X'
            html += `<div class='reqContent'>\
                <div class='num_content'><p>${result[i].id}</p></div>\
                <div class='company_content'><p>${result[i].company_name}</p></div>\
                <div class='email_content'><p>${result[i].account_name}</p></div>\
                <div class='user_content'><p>${result[i].owner_name}</p></div>\
                <div class='phone_content'><p>${result[i].telephone}</p></div>\
                <div class='database_content'><p>${databaseExist}</p></div>\
                <div class='bucket_content'><p>${kr_BucketExist}</p></div>\
                <div class='bucket_content'><p>${krs_BucketExist}</p></div>\
                <div class='no_content'>\
                    <div class='noBtn' value=${result[i].id} database=${databaseExist} kr_bucket=${kr_BucketExist} krs_bucket=${krs_BucketExist}>\
                        <p>탈퇴</p>\
                    </div>\
                </div>\
            </div>`
        }
        return html
    },
}