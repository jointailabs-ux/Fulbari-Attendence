//var uri = "https://localhost:8030/morfinauth/"; //Secure
var uri = "http://localhost:8030/morfinauth/"; //Non-Secure
//var uri = "http://rd.mxface.ai:8030/morfinauth/"; //Custom Cert

function GetMorFinAuthInfo(connectedDvc , clientKey) {
    var MorFinAuthRequest = {
        "ConnectedDvc": connectedDvc,
        "ClientKey": clientKey
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("info", jsondata);
}
function IsDeviceConnected(connectedDvc) {
     var MorFinAuthRequest = {
         "ConnectedDvc": connectedDvc
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("checkdevice", jsondata);
}
function InitDevice(connectedDvc ,clientKey) {
    var MorFinAuthRequest = {
        "ConnectedDvc": connectedDvc,
        "ClientKey": clientKey
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("initdevice", jsondata);
}
function UninitDevice() {
    return PostMorFinAuthClient("uninitdevice", "", 0);
} 
function GetSupportedDeviceList() {
    return PostMorFinAuthClient("supporteddevicelist", "", 0);
} 
function GetConnectedDeviceList() {
    return PostMorFinAuthClient("connecteddevicelist", "", 0);
}
function GetMorFinAuthKeyInfo(key) {
    var MorFinAuthRequest = {
        "Key": key,
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("keyinfo", jsondata);
}
function CaptureFinger(quality, timeout) {
    var MorFinAuthRequest = {
        "Quality": quality,
        "TimeOut": timeout
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("capture", jsondata);
}
function VerifyFinger(ProbFMR, GalleryFMR, tmpFormat) {
    var MorFinAuthRequest = {
        "ProbTemplate": ProbFMR,
        "GalleryTemplate": GalleryFMR,
        "TmpFormat": tmpFormat
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("verify", jsondata);
}
function MatchFinger(quality, timeout, GalleryFMR, tmpFormat) {
    var MorFinAuthRequest = {
        "Quality": quality,
        "TimeOut": timeout,
        "GalleryTemplate": GalleryFMR,
        "TmpFormat": tmpFormat
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("match", jsondata);
}
function GetImage(imgformat) {
    var MorFinAuthRequest = {
        "ImgFormat": imgformat
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("getimage", jsondata);
}
function GetTemplate(tmpFormat) {
    var MorFinAuthRequest = {
        "TmpFormat": tmpFormat
    };
    var jsondata = JSON.stringify(MorFinAuthRequest);
    return PostMorFinAuthClient("gettemplate", jsondata);
}
function PostMorFinAuthClient(method, jsonData, isBodyAvailable) {
    var res;
    if (isBodyAvailable == 0) {
        $.support.cors = true;
        var httpStaus = false;
        $.ajax({
            type: "POST",
            async: false,
            crossDomain: true,
            url: uri + method,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            processData: false,
            success: function (data) {
                httpStaus = true;
                res = { httpStaus: httpStaus, data: data };
            },
            error: function (jqXHR, ajaxOptions, thrownError) {
                res = { httpStaus: httpStaus, err: getHttpError(jqXHR) };
            },
        });
    }
    else {
        $.support.cors = true;
        var httpStaus = false;
        $.ajax({
            type: "POST",
            async: false,
            crossDomain: true,
            url: uri + method,
            contentType: "application/json; charset=utf-8",
            data: jsonData,
            dataType: "json",
            processData: false,
            success: function (data) {
                httpStaus = true;
                res = { httpStaus: httpStaus, data: data };
            },
            error: function (jqXHR, ajaxOptions, thrownError) {
                res = { httpStaus: httpStaus, err: getHttpError(jqXHR) };
            },
        });
    }
    return res;
}
function GetMorFinAuthClient(method) {
    var res;
    $.support.cors = true;
    var httpStaus = false;
    $.ajax({
        type: "GET",
        async: false,
        crossDomain: true,
        url: uri + method,
        contentType: "application/json; charset=utf-8",
        processData: false,
        success: function (data) {
            httpStaus = true;
            res = { httpStaus: httpStaus, data: data };
        },
        error: function (jqXHR, ajaxOptions, thrownError) {
            res = { httpStaus: httpStaus, err: getHttpError(jqXHR) };
        },
    });
    return res;
}
function getHttpError(jqXHR) {
    var err = "Unhandled Exception";
    if (jqXHR.status === 0) {
        err = 'Service Unavailable';
    } else if (jqXHR.status == 404) {
        err = 'Requested page not found';
    } else if (jqXHR.status == 500) {
        err = 'Internal Server Error';
    } else if (thrownError === 'parsererror') {
        err = 'Requested JSON parse failed';
    } else if (thrownError === 'timeout') {
        err = 'Time out error';
    } else if (thrownError === 'abort') {
        err = 'Ajax request aborted';
    } else {
        err = 'Unhandled Error';
    }
    return err;
}