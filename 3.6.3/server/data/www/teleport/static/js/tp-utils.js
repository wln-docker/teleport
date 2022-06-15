//
// basic and common functions.
//

"use strict";

//===================================================
// constants.
//===================================================
const KB = 1024;
const MB = 1048576;
const GB = 1073741824;
const TB = 1099511627776;
const PB = 1125899906842624;

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

//===================================================
// extend prototype functions.
//===================================================
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

if (!String.prototype.realLength) {
    String.prototype.realLength = function () {
        let _len = 0;
        for (let i = 0; i < this.length; i++) {
            if (this.charCodeAt(i) > 255) _len += 2; else _len += 1;
        }
        return _len;
    };
}

//===================================================
// input field validation check
//===================================================
// http://jsfiddle.net/ghvj4gy9/embedded/result,js/
function tp_is_email(email) {
    //let re = /^(\w)+(\.\w+)*@(\w)+((\.\w+)+)$/;
    let re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    return re.test(email);
}

function tp_is_ip(ip) {
    let re = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
    return re.test(ip);
}

function tp_is_domain(domain) {
    // let re = /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+(:\d+)*(\/\w+\.\w+)*$/;
    let re = /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/;
    return re.test(domain);
}

function tp_is_host(host) {
    return tp_is_ip(host) || tp_is_domain(host);
}

function tp_is_empty_str(str) {
    if (_.isEmpty(str))
        return true;
    let regu = "^[ \t]+$";
    let re = new RegExp(regu);
    return re.test(str);
}

//===================================================
// useful functions.
//===================================================

function tp_digital_precision(num, keep) {
    return Math.round(num * Math.pow(10, keep)) / Math.pow(10, keep);
}

// function prefixInteger(num, length) {
//     return (num / Math.pow(10, length)).toFixed(length).substr(2);
// }

function tp_size2str(size, precision) {
    precision = precision || 0;
    let s = 0, k = '';
    if (size < KB) {
        s = size;
        k = 'B';
    } else if (size < MB) {
        s = tp_digital_precision(size / KB, precision);
        k = 'KB'
    } else if (size < GB) {
        s = tp_digital_precision(size / MB, precision);
        k = 'MB'
    } else if (size < TB) {
        s = tp_digital_precision(size / GB, precision);
        k = 'GB'
    } else if (size < PB) {
        s = tp_digital_precision(size / TB, precision);
        k = 'TB'
    } else {
        s = tp_digital_precision(size / PB, precision);
        k = 'PB'
    }

    return '' + s + ' ' + k;
}

function tp_second2str(sec) {
    let _ret = '';
    if (sec >= SECONDS_PER_DAY) {
        let _d = Math.floor(sec / SECONDS_PER_DAY);
        _ret = '' + _d + '天';
        sec = sec % SECONDS_PER_DAY;
    }

    if (sec >= SECONDS_PER_HOUR) {
        let _h = Math.floor(sec / SECONDS_PER_HOUR);
        _ret += '' + _h + '小时';
        sec = sec % SECONDS_PER_HOUR;
    } else if (_ret.length > 0) {
        _ret += '0小时';
    }

    if (sec >= SECONDS_PER_MINUTE) {
        let _m = Math.floor(sec / SECONDS_PER_MINUTE);
        _ret += '' + _m + '分';
        sec = sec % SECONDS_PER_MINUTE;
    } else if (_ret.length > 0) {
        _ret += '0分';
    }

    _ret += '' + sec + '秒';
    return _ret;
}

function tp_get_cookie(name) {
    let r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

function tp_timestamp_ms() {
    return (new Date()).getTime();
}

function tp_timestamp_sec() {
    return Math.floor((new Date()).getTime() / 1000);
}

function tp_format_datetime_ms(timestamp, format) {
    let d = new Date(timestamp);
    let fmt = format || 'yyyy-MM-dd HH:mm:ss';
    let o = {
        "M+": d.getMonth() + 1, //月份
        "d+": d.getDate(), //日
        "H+": d.getHours(), //小时
        "m+": d.getMinutes(), //分
        "s+": d.getSeconds() //秒
        //"q+": Math.floor((this.getMonth() + 3) / 3), //季度
        //"S": d.getMilliseconds() //毫秒
    };

    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (let k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            if (o.hasOwnProperty(k))
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

function tp_format_datetime(timestamp, format) {
    return tp_format_datetime_ms(timestamp * 1000, format);
}

const base64KeyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function tp_base64_encode(input) {
    let output = "";
    let chr1, chr2, chr3 = "";
    let enc1, enc2, enc3, enc4 = "";
    let i = 0;
    do {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output = output + base64KeyStr.charAt(enc1) + base64KeyStr.charAt(enc2) + base64KeyStr.charAt(enc3) + base64KeyStr.charAt(enc4);
        chr1 = chr2 = chr3 = "";
        enc1 = enc2 = enc3 = enc4 = "";
    } while (i < input.length);
    return output;
}

function tp_base64_to_bin(data) {
    let o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        tmp_arr = [];

    if (!data) {
        return tmp_arr;
    }

    do {
        h1 = base64KeyStr.indexOf(data.charAt(i++));
        h2 = base64KeyStr.indexOf(data.charAt(i++));
        h3 = base64KeyStr.indexOf(data.charAt(i++));
        h4 = base64KeyStr.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 === 64) {
            tmp_arr.push(o1);
        } else if (h4 === 64) {
            tmp_arr.push(o1);
            tmp_arr.push(o2);
        } else {
            tmp_arr.push(o1);
            tmp_arr.push(o2);
            tmp_arr.push(o3);
        }
    } while (i < data.length);

    return tmp_arr;
}

function tp_base64_decode(data) {
    let o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        tmp_arr = [];

    if (!data) {
        return data;
    }
    data += '';

    do {
        h1 = base64KeyStr.indexOf(data.charAt(i++));
        h2 = base64KeyStr.indexOf(data.charAt(i++));
        h3 = base64KeyStr.indexOf(data.charAt(i++));
        h4 = base64KeyStr.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 === 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 === 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
    } while (i < data.length);

    return tmp_arr.join('');
}

function tp_get_file_name(path) {
    let reg = /(\\+)/g;
    path = path.replace(reg, "/");
    let _path = path.split('/');
    return _path[_path.length - 1]
}

function htmlEncode(_s) {
    if (_s.length === 0)
        return "";
    let s = _s.replace(/&/g, "&amp;");
    s = s.replace(/</g, "&lt;");
    s = s.replace(/>/g, "&gt;");
    //s = s.replace(/ /g, "&nbsp;");
    s = s.replace(/\'/g, "&#39;");
    s = s.replace(/\"/g, "&quot;");
    return s;
}

//
///*2.用正则表达式实现html解码*/
//function htmlDecode(_s) {
//	if (_s.length == 0) return "";
//	let s = str.replace(/&amp;/g, "&");
//	s = s.replace(/&lt;/g, "<");
//	s = s.replace(/&gt;/g, ">");
//	s = s.replace(/&nbsp;/g, " ");
//	s = s.replace(/&#39;/g, "\'");
//	s = s.replace(/&quot;/g, "\"");
//	return s;
//}

// 生成一个随机密码
function tp_gen_password(len) {
    len = len || 8;
    const _chars = ['ABCDEFGHJKMNPQRSTWXYZ', 'abcdefhijkmnprstwxyz', '2345678']; // 默认去掉了容易混淆的字符oO,Ll,9gq,Vv,Uu,I1
    let _chars_len = [];
    let i = 0;
    for (i = 0; i < _chars.length; ++i) {
        _chars_len[i] = _chars[i].length;
    }
    let ret = '';

    let have_CHAR = false;
    let have_char = false;
    let have_num = false;
    for (; ;) {
        ret = '';
        for (i = 0; i < len; i++) {
            let idx = Math.floor(Math.random() * _chars.length);
            if (idx === 0)
                have_CHAR = true;
            else if (idx === 1)
                have_char = true;
            else
                have_num = true;
            ret += _chars[idx].charAt(Math.floor(Math.random() * _chars_len[idx]));
        }

        if (have_CHAR && have_char && have_num)
            break;
    }

    return ret;
}

// 弱密码检测
function tp_check_strong_password(p) {
    if (p.length < 8)
        return false;

    let i, s = 0;
    for (i = 0; i < p.length; ++i) {
        let c = p.charCodeAt(i);
        if (c >= 48 && c <= 57) // 数字
            s |= 1;
        else if (c >= 65 && c <= 90) // 大写字母
            s |= 2;
        else if (c >= 97 && c <= 122) // 小写字母
            s |= 4;
        else
            s |= 8;
    }

    return !!((s & 1) && (s & 2) && (s & 4));
}

// 简单判断操作系统
function tp_get_os_type() {
    let p = navigator.platform;
    console.log('navigator.platform:', p);
    let isWin = (p === "Win32") || (p === "Windows");
    let isMac = (p === "Mac68K") || (p === "MacPPC") || (p === "Macintosh") || (p === "MacIntel");
    if (isMac)
        return "macos";
    let isUnix = (p === "X11") && !isWin;
    let isLinux = (String(p).indexOf("Linux") > -1);
    if (isLinux || isUnix)
        return "linux";
    if (isWin)
        return 'windows'

    return "UNKNOWN";
}
