'use strict';

/**
 * DIS.Web.RequestTable 네임스페이스
 * @class DIS.Web.RequestTable
 */
DIS.Web.RequestTable = DIS.Web.RequestTable || {};

/**
 * DIS.Web.RequestTable 클래스를 참조하는 글로벌 멤버 변수
 * @interface requestTable
 */
var requestTable = DIS.Web.RequestTable;
requestTable = {
    postDataSearch: function (filter_video, filter_image, filter_album, filter_reco, filter_norest, filter_file, filter_rest, startDate, endDate) {
        var postdata = { filter_video: filter_video, filter_image: filter_image, filter_album: filter_album, filter_reco: filter_reco, filter_norest: filter_norest, filter_file: filter_file, filter_rest: filter_rest, startDate: startDate, endDate: endDate }
        var requestList = ''
        $.ajax({
            method: "post",
            url: "http://encrypt-api.noonai.kr/api/search/encrypt",
            data: postdata,
            async: false,
            success: function (data) {
                // result = data['progress']
                requestList = data;
                console.log(data)
            },
            error: function (xhr, status) {
                alert(JSON.stringify(xhr) + " : " + JSON.stringify(status));
            }
        });

        var htmlStr = ''

        if (requestList[0] == null) {
            htmlStr = '<div class="nodata"><p>요청 기록이 존재하지 않습니다.</p></div>'
        }
        else {
            for (var i = 0; i < requestList.length; i++) {
                var date = new Date(requestList[i]['request_date'])

                var namelist = requestList[i]['request_file_list'].split('\n')
                namelist = namelist.splice(0, namelist.length - 1);

                if (namelist.length > 1) {
                    var list = "<label> 외 " + (Number(namelist.length) - 1) + "개</label>"
                    var css = ""
                }
                else {
                    var list = ""
                    var css = 'style="margin:auto 0 auto auto"'
                }

                if (requestList[i]['restoration'] == 1) var restoration = "복원 가능"
                else var restoration = "복원 불가능"

                var fileList = requestList[i]['request_file_list'].split('\n');
                fileList = fileList.splice(0, fileList.length - 1);

                if (requestList[i]['file_type'] == "video") var type = "동영상 파일"
                else if (requestList[i]['file_type'] == "image") var type = "이미지 파일"
                if (requestList[i]['file_type'] == "image" && fileList.length > 1) var type = "이미지 그룹"

                var status = (requestList[i]['complete'] == 1) ? '<p>완료</p>' : '<p id="progress"></p>'
                // if(requestList[i]['complete'] == 1){
                //     var status = '<p>완료</p>'
                // }
                // else if(requestList[i]['complete'] == 0){
                //     var status = '<p>오류발생</p>'
                // }
                // else{
                //     var status = '<p id="progress"></p>'
                // }

                if (status == "<p>완료</p>") {
                    var css = "";
                    var text = "상세정보";
                }
                else {
                    var css = "disable";
                    var text = "진행중";
                }
                htmlStr += '<div class="logContent" id=enc_request_index-' + requestList[i]['id'] + '>\
                            <div class="id_content"><p>'+ underTen(requestList[i]['id']) + '</p></div>\
                            <div class="type_content"><p>'+ type + '</p></div>\
                            <div class="name_content" '+ css + '><p>' + namelist[0] + '</p>' + list + '</div>\
                            <div class="date_content"><p>'+ dateFormat(date) + '</p></div>\
                            <div class="rest_content"><p>'+ restoration + '</p></div>\
                            <div class="status_content">'+ status + '</div>\
                            <div class="detail_content">\
                                <div data-id="'+ requestList[i]['id'] + '" data-type="' + type + '" class="detailInfo ' + css + '">\
                                    <p>'+ text + '</p>\
                                </div>\
                            </div>\
                        </div>'
            }
        }
        return htmlStr;
    },

    getMonthUsage: function (searchMonth) {
        var usageObject = ''
        $.ajax({
            method: "get",
            url: `/api/usage?searchMonth=${searchMonth}`,
            async: false,
            success: function (data) {
                console.log(data)
                usageObject = data;
            },
            error: function (xhr, status) {
                alert(JSON.stringify(xhr) + " : " + JSON.stringify(status));
            }
        });

        var htmlStr = ""

        var userName = []

        // var usageObject = {}

        var temp = searchMonth.split('-');
        var year = temp[0]
        var month = temp[1]
        htmlStr += "<div class='usageBox'>\
                        <div class='textArea'>\
                            <p>"+year+"년 "+month+"월 총 사용량</p>\
                        </div>\
                        <div class='tbHeader'>\
                            <div class='tenant_header'><h3>테넌트</h3></div>\
                            <div class='user_header'><h3>기관명</h3></div>\
                            <div class='encrypt_upload_header'><h3>비식별화 요청 건수</h3></div>\
                            <div class='decrypt_upload_header'><h3>복호화 요청 건수</h3></div>\
                            <div class='encrypt_download_header'><h3>파일 다운로드 건수</h3></div>\
                            <div class='total_download_header'><h3>총 다운로드 용량</h3></div>\
                        </div>\
                        <div class='tbBody'>"

        for(var keys in usageObject){
                htmlStr += "<div class='tbContent'>\
                                <div class='tenant_content'><p>"+keys+"</p></div>\
                                <div class='user_content'><p>"+usageObject[keys]['company_name']+"</p></div>\
                                <div class='encrypt_upload_content'><p>"+usageObject[keys]['encrypt_request_count']+"</p></div>\
                                <div class='decrypt_upload_content'><p>"+usageObject[keys]['decrypt_request_count']+"</p></div>\
                                <div class='encrypt_upload_content'><p>"+usageObject[keys]['download_request_count']+"</p></div>\
                                <div class='total_download_content'><p>"+formatBytes(usageObject[keys]['total_download'])+"</p></div>\
                            </div>"
        }
        htmlStr += "    </div>\
                    </div>"

        // //월별 청구 금액
        htmlStr += `<div class='usageBox'>
                        <div class='textArea'>
                            <p>${year}년 ${month}월 청구 금액</p>
                        </div>
                        <div class='tbHeader'>
                            <div class='tenant_header'><h3>테넌트</h3></div>\
                            <div class='user_header'><h3>기관명</h3></div>\
                            <div class='encrypt_charge_header'><h3>비식별화 서비스 요금</h3></div>
                            <div class='decrypt_charge_header'><h3>복호화 서비스 요금</h3></div>
                            <div class='download_charge_header'><h3>다운로드 발생 비용</h3></div>
                            <div class='total_charge_header'><h3>합계</h3></div>
                        </div>
                        <div class='tbBody'>`

        for(var keys in usageObject) {
            let totalEncryptCharge = Number(usageObject[keys]['encrypt_request_charge']);
            let totalDecryptCharge = Number(usageObject[keys]['decrypt_request_charge']);
            let totalDownloadCharge = Number(usageObject[keys]['download_request_charge']);
            let totalCharge = totalEncryptCharge + totalDecryptCharge + totalDownloadCharge;

            htmlStr += `<div class='tbContent'>
                            <div class='tenant_content'><p>${keys}</p></div>\
                            <div class='user_content'><p>${usageObject[keys]['company_name']}</p></div>
                            <div class='encrypt_charge_content'><p>${totalEncryptCharge.toLocaleString('en-US')} 원</p></div>
                            <div class='decrypt_charge_content'><p>${totalDecryptCharge.toLocaleString('en-US')} 원</p></div>
                            <div class='download_charge_content'><p>${totalDownloadCharge.toLocaleString('en-US')} 원</p></div>
                            <div class='total_charge_content'><p>${totalCharge.toLocaleString('en-US')} 원</p></div>
                        </div>`
        }
        htmlStr += `</div>
        </div>`
                        

        return htmlStr;
    },
}