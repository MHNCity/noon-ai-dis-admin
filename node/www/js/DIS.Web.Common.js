'use strict';

const patterns = {
    regExp: /[~!@#$%^&*()_+|<>?:{}]/,
    number: /[0-9]/,
    upperCase: /[A-Z]/,
    lowerCase: /[a-z]/,
    length: /^.{8,20}$/,
    email: /^[a-zA-Z0-9+-\_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
}

/** 
 * DIS 네임스페이스
 * @author 이민형(2022.07.20)
 * @namespace DIS 
 */
var DIS = DIS || {};

/**
 * DIS.Web 네임스페이스
 * @namespace DIS.Web
 */
DIS.Web = DIS.Web || {};

/**
 * DIS.Web.Common 네임스페이스
 * @class DIS.Web.Common
 */
DIS.Web.Common = DIS.Web.Common || {};

/**
 * DIS.Web.Common 클래스를 참조하는 글로벌 멤버 변수
 * @interface comm
 */
var comm = DIS.Web.Common;
comm = {
    /**
     * 사용자 로그인시 사용되는 공통 메서드 입니다.
     * @param {string} userId 회원 아이디
     * @param {string} password 회원 비밀번호
     */
    
    getEnv: function () {
        let env;
        $.ajax({
            method: "get",
            url: "/api/env",
            async: false,
            success: function (data) {
                if (data.message == 'success') env = data.env;
            }, // success 
            error: function (xhr, status) {
                alert("error : " + JSON.stringify(xhr) + " : " + JSON.stringify(status));
            }
        })

        return env;
    },

    getUser: function () {
        var result = '';
        var resultStr = '';
        $.ajax({
            method: "get",
            url: "/api/user",
            async: false,
            success: function (data) {
                result = data
            },
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            }
        });
        // resultStr = '<p>접속 서버 환경: ' + result.env + '</p>\
        //     <p>현재 테넌트: tenant-'+ result.tenant_id + '</p>\
        //     <p>유저 권한: '+ result.auth + '</p>\
        //     <p>회사명: '+ result.company_name + '</p>\
        //     <p>현재 아이디: '+ result.account_name + '</p>';
        resultStr = "<p>"+result.user_name+'님</p>'
        return resultStr;
    },

    getUserAccount: function () {
        let account_name = '';

        $.ajax({
            method: "get",
            url: "/api/user",
            async: false,
            success: function (data) {
                account_name = data.account_name
            },
            error: function (xhr, status) {
                alert(xhr + " : " + status);
            }
        });
        
        return account_name;
    },
}