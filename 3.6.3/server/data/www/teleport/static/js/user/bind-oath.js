"use strict";

$app.on_init = function (cb_stack) {
    $app.dom = {
        // title: $('#title'),
        // icon_bg: $('#icon-bg'),
        tp_time: $('#teleport-time')

        , op_message: $('#area-auth [data-field="message"]')

        , btn_show_oath_app: $('#btn-show-oath-app')
        , dlg_oath_app: $('#dlg-oath-app')

        , qrcode: {
            area: $('#area-qrcode')
            , name: $('#area-qrcode [data-field="name"]')
            , image: $('#area-qrcode [data-field="qrcode"]')
            , desc: $('#area-qrcode [data-field="desc"]')
        }

        , auth: {
            area: $('#area-auth')
            , input_username: $('#area-auth [data-field="input-username"]')
            , input_password: $('#area-auth [data-field="input-password"]')
            , btn_submit: $('#area-auth [data-field="btn-submit"]')
            , message: $('#area-auth [data-field="message"]')
        }

        , bind: {
            dlg: $('#dlg-bind-oath')
            , qrcode_img: $('#dlg-bind-oath [data-field="oath-secret-qrcode"]')
            , tmp_secret: $('#dlg-bind-oath [data-field="tmp-oath-secret"]')
            , input_oath_code: $('#dlg-bind-oath [data-field="oath-code"]')
            , btn_submit: $('#dlg-bind-oath [data-field="btn-submit"]')
            , message: $('#dlg-bind-oath [data-field="message"]')
        }
    };

    $app.tp_time = 0;
    $app.dom.op_message = $app.dom.auth.message;
    $app.dom.bind.dlg.on('shown.bs.modal', function () {
        $app.dom.op_message = $app.dom.bind.message;
    });
    $app.dom.bind.dlg.on('hidden.bs.modal', function () {
        $app.dom.op_message = $app.dom.auth.message;
    });

    // $app.show_bind_dlg();

    // $app.dom.icon_bg.addClass('fa fa-crosshairs').css('color', '#8140f1');
    $app.dom.btn_show_oath_app.click(function () {
        $app.dom.dlg_oath_app.modal();
    });

    $('[data-switch]').click(function () {
        var n = $(this).attr('data-switch');
        console.log(n);

        var name, img, desc;
        if (n === 'g-ios-appstore') {
            name = '<i class="fab fa-apple"></i> ?????????????????????';
            img = 'img/qrcode/google-oath-appstore.png';
            desc = '????????? iOS?????? Apple Store ??????';
        } else if (n === 'g-android-baidu') {
            name = '<i class="fab fa-android"></i> ?????????????????????';
            img = 'img/qrcode/google-oath-baidu.png';
            desc = '????????? Android??????????????????????????????';
        } else if (n === 'g-android-google') {
            name = '<i class="fab fa-android"></i> ?????????????????????';
            img = 'img/qrcode/google-oath-googleplay.png';
            desc = '????????? Android?????? Google Play ??????';
        } else if (n === 'mi-ios-appstore') {
            name = '<i class="fab fa-apple"></i> ??????????????????';
            img = 'img/qrcode/xiaomi-oath-appstore.png';
            desc = '????????? iOS?????? Apple Store ??????';
        } else if (n === 'mi-android-mi') {
            name = '<i class="fab fa-android"></i> ??????????????????';
            img = 'img/qrcode/xiaomi-oath-xiaomi.png';
            desc = '????????? Android??????????????????????????????';
        } else if (n === 'wechat') {
            name = '<i class="fab fa-wexin"></i> ?????? ?? ?????????';
            img = 'img/qrcode/wechat.png';
            desc = '????????? iOS/Android?????????????????????????????????????????????????????????';
        }

        $app.dom.qrcode.name.html(name);
        $app.dom.qrcode.image.attr('src', '/static/' + img);
        $app.dom.qrcode.desc.html(desc);
        if (!$app.dom.qrcode.image.hasClass('selected'))
            $app.dom.qrcode.image.addClass('selected');
    });

    $app.dom.auth.btn_submit.click(function () {
        $app.on_auth_user();
    });

    $app.dom.auth.input_username.keydown(function (event) {
        if (event.which === 13) {
            $app.dom.auth.input_password.focus();
        } else {
            $app.hide_op_box();
            $('[data-toggle="popover"]').popover('hide');
        }
    });
    $app.dom.auth.input_password.keydown(function (event) {
        if (event.which === 13) {
            $app.on_auth_user();
        } else {
            $app.hide_op_box();
            $('[data-toggle="popover"]').popover('hide');
        }
    });

    $app.dom.bind.input_oath_code.keydown(function (event) {
        if (event.which === 13) {
            $app.on_save();
        } else {
            $app.hide_op_box();
            $('[data-toggle="popover"]').popover('hide');
        }
    });

    $app.dom.bind.btn_submit.click(function(){
        $app.on_save();
    });

    // ?????????????????????
    $app.sync_tp_time = function () {
        $tp.ajax_post_json('/system/get-time', {},
            function (ret) {
                if (ret.code === TPE_OK) {
                    $app.tp_time = ret.data;
                    $app.show_tp_time();
                }
            },
            function () {
            }
        );
    };

    $app.sync_tp_time();

    $app.show_tp_time = function () {
        if ($app.tp_time === 0)
            return;
        $app.dom.tp_time.text(tp_format_datetime($app.tp_time));
        $app.tp_time += 1;
    };

    setInterval($app.show_tp_time, 1000);
    // ??????????????????????????????????????????????????????????????????????????????????????????
    setInterval($app.sync_tp_time, 1000 * 60 * 5);

    cb_stack.exec();
};

$app.hide_op_box = function () {
    $app.dom.op_message.hide();
};

$app.show_op_box = function (op_type, op_msg) {
    $app.dom.op_message.html(op_msg);
    $app.dom.op_message.removeClass().addClass('op_box op_' + op_type);
    $app.dom.op_message.show();
};

$app.on_auth_user = function () {
    $app.hide_op_box();
    var str_username = $app.dom.auth.input_username.val();
    var str_password = $app.dom.auth.input_password.val();

    if (str_username.length === 0) {
        $app.show_op_box('error', '?????????????????????');
        $app.dom.auth.input_username.attr('data-content', "???????????????????????????").focus().popover('show');
        return;
    }

    if (str_password.length === 0) {
        $app.show_op_box('error', '??????????????????');
        $app.dom.auth.input_password.attr('data-content', "????????????????????????").focus().popover('show');
        return;
    }

    $app.dom.auth.btn_submit.attr('disabled', 'disabled');
    $tp.ajax_post_json('/user/verify-user', {username: str_username, password: str_password, check_bind_oath: true},
        function (ret) {
            $app.dom.auth.btn_submit.removeAttr('disabled');
            if (ret.code === TPE_OK) {
                // ????????????
                $app.hide_op_box();

                // ?????????????????????
                $app.show_bind_dlg();
            }
            else {
                $app.hide_op_box();
                $app.show_op_box('error', tp_error_msg(ret.code, ret.message));
            }
        },
        function () {
            $app.hide_op_box();
            $app.show_op_box('error', '????????????????????????????????????????????????????????????');
            $app.dom.auth.btn_submit.removeAttr('disabled');
        }
    );
};

$app.show_bind_dlg = function () {
    var str_username = $app.dom.auth.input_username.val();
    $tp.ajax_post_json('/user/gen-oath-secret', {},
        function (ret) {
            if (ret.code === TPE_OK) {
                $app.dom.bind.qrcode_img.attr('src', '/user/oath-secret-qrcode?u=' + str_username + '&rnd=' + Math.random());
                $app.dom.bind.tmp_secret.text(ret.data.tmp_oath_secret);
                $app.dom.bind.dlg.modal({backdrop: 'static'});
            } else {
                $tp.notify_error('??????????????????????????????' + tp_error_msg(ret.code, ret.message));
            }
        },
        function () {
            $tp.notify_error('??????????????????????????????????????????');
        }
    );
};

$app.on_save = function () {
    var str_username = $app.dom.auth.input_username.val();
    var str_password = $app.dom.auth.input_password.val();
    var oath_code = $app.dom.bind.input_oath_code.val();

    if (oath_code.length === 0) {
        $app.show_op_box('error', '???????????????????????????');
        $app.dom.bind.input_oath_code.attr('data-content', "???????????????????????????").focus().popover('show');
        return;
    }
    if (oath_code.length !== 6) {
        $app.show_op_box('error', '????????????????????????');
        $app.dom.bind.input_oath_code.attr('data-content', "?????????????????? 6 ????????????").focus().popover('show');
        return;
    }

    $tp.ajax_post_json('/user/do-bind-oath', {username: str_username, password: str_password, oath_code: oath_code},
        function (ret) {
            $app.dom.auth.btn_submit.removeAttr('disabled');
            if (ret.code === TPE_OK) {
                // ????????????
                $app.hide_op_box();
                $app.show_op_box('success', '??????????????????????????????????????????');
                setTimeout(function(){
                    window.location.href = '/';
                }, 3000);
            }
            else {
                $app.hide_op_box();
                $app.show_op_box('error', tp_error_msg(ret.code, ret.message));
            }
        },
        function () {
            $app.hide_op_box();
            $app.show_op_box('error', '????????????????????????????????????????????????????????????');
            $app.dom.auth.btn_submit.removeAttr('disabled');
        }
    );
};
