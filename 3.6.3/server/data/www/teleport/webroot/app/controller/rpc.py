# -*- coding: utf-8 -*-

import json
import urllib.parse

import tornado.gen
from app.const import *
from app.base.configs import tp_cfg
from app.base.session import tp_session
from app.base.core_server import core_service_async_post_http
from app.model import user
from app.model import record
from app.model import ops
from app.model import account
from app.model import host
from app.base.stats import tp_stats
from app.base.logger import *
from app.base.controller import TPBaseJsonHandler
from app.logic.auth.password import tp_password_verify
from app.base.utils import tp_timestamp_sec, tp_unique_id


class RpcHandler(TPBaseJsonHandler):
    @tornado.gen.coroutine
    def get(self):
        _uri = self.request.uri.split('?', 1)
        if len(_uri) != 2:
            return self.write_json(TPE_PARAM)

        try:
            _req = json.loads(urllib.parse.unquote(_uri[1]))

            if 'method' not in _req or 'param' not in _req:
                return self.write_json(TPE_PARAM)
        except:
            return self.write_json(TPE_JSON_FORMAT)

        yield self._dispatch(_req['method'], _req['param'])

    @tornado.gen.coroutine
    def post(self):
        req = self.request.body.decode('utf-8')
        if req == '':
            return self.write_json(TPE_PARAM)

        yield self._dispatch(req)

    @tornado.gen.coroutine
    def _dispatch(self, method, param):
        if 'get_conn_info' == method:
            return self._get_conn_info(param)
        elif 'session_begin' == method:
            return self._session_begin(param)
        elif 'session_update' == method:
            return self._session_update(param)
        elif 'session_end' == method:
            return self._session_end(param)
        elif 'register_core' == method:
            return self._register_core(param)
        elif 'exit' == method:
            return self._exit()
        else:
            log.e('WEB-JSON-RPC got unknown method: `{}`.\n'.format(method))

        return self.write_json(TPE_UNKNOWN_CMD)

    def _get_conn_info(self, param):
        if 'conn_id' in param:
            return self._get_conn_info_by_conn_id(param)
        elif 'token' in param:
            return self._get_conn_info_by_token(param)
        else:
            return self.write_json(TPE_PARAM)

    def _get_conn_info_by_conn_id(self, param):
        conn_id = param['conn_id']
        x = tp_session().taken('tmp-conn-info-{}'.format(conn_id), None)
        if x is None:
            return self.write_json(TPE_NOT_EXISTS)
        else:
            return self.write_json(TPE_OK, data=x)

    def _get_conn_info_by_token(self, param):
        # ???????????????
        # 1. ???????????????????????????????????????????????????????????????ops_map.uni_id???????????????uni_id??????
        # 2. ?????????????????????????????????????????????????????????????????????????????????uni_id??????????????????????????????
        # ????????????????????????????????? controller/ops.py ?????? DoGetSessionIDHandler ?????????
        # todo: ??? DoGetSessionIDHandler ???????????????????????????????????????????????????????????????

        token = param['token']
        password = param['password']
        client_ip = param["client_ip"]
        if len(token) != 12:
            log.e('invalid ops-token, should be 12 characters.\n')
            return self.write_json(TPE_PARAM)

        # ??????token??????
        err, token_info = ops.get_ops_token_by_token(token)
        if err != TPE_OK:
            log.e('can not get info of ops-token {}, err={}.\n'.format(token, err))
            return self.write_json(err)

        # ??????token?????????
        valid_from = token_info['valid_from']
        valid_to = token_info['valid_to']
        now = tp_timestamp_sec()
        if (valid_from > now > 0) or (0 < valid_to < now):
            log.e('ops-token {} expired.\n'.format(token))
            return self.write_json(TPE_EXPIRED)

        err, user_info = user.get_user_info(token_info['u_id'])
        if err != TPE_OK:
            log.e('can not get user info by user id {}, err={}.\n'.format(token_info['u_id'], err))
            return self.write_json(err)
        if user_info.privilege == 0 or user_info.state != TP_STATE_NORMAL:
            log.e('user "{}" not available, state={}, privilege={}.\n'.format(user_info.username, user_info.state, user_info.privilege))
            return self.write_json(TPE_PRIVILEGE)

        # token: ??????????????????????????????????????????????????????????????????12???????????????
        #  mode=0, TP_OPS_TOKEN_USER??????????????? u_id ?????????tp????????????????????????
        #  mode=1, TP_OPS_TOKEN_TEMP???????????????????????????password????????????
        if token_info['mode'] == TP_OPS_TOKEN_USER:
            if not tp_password_verify(password, user_info['password']):
                log.e('verify user "{}" password failed.\n'.format(user_info.username))
                return self.write_json(TPE_PRIVILEGE)
        elif token_info['mode'] == TP_OPS_TOKEN_TEMP:
            if not ops.verify_ops_token_temp_password(token_info['id'], password):
                log.e('verify ops-token [{}:{}] by temp password failed.\n'.format(token_info['id'], token_info['token']))
                return self.write_json(TPE_PRIVILEGE)
        else:
            log.e('unknown ops-token type {}.\n'.format(token_info['mode']))
            return self.write_json(TPE_PARAM)

        uni_id = token_info['uni_id']

        conn_info = dict()
        conn_info['_enc'] = 1
        conn_info['host_id'] = 0
        conn_info['client_ip'] = client_ip
        conn_info['user_id'] = token_info['u_id']
        conn_info['user_username'] = '{}{}'.format('[????????????] ' if token_info['mode'] == TP_OPS_TOKEN_TEMP else '', user_info.username)

        if uni_id is not None and len(uni_id) > 0:
            # ???????????????auth_id????????????????????????????????????????????????????????????????????????????????????
            if (user_info['privilege'] & TP_PRIVILEGE_OPS) == 0:
                log.e('user privilege {} not fit require {}.\n'.format(user_info.privilege, TP_PRIVILEGE_OPS))
                return self.write_json(TPE_PRIVILEGE)

            # ??????auth_id?????????????????????????????????????????????????????????????????????????????????
            auth_id = uni_id
            ops_auth, err = ops.get_auth(auth_id)
            if err != TPE_OK:
                log.e('can not got ops auth info by uni_id {}, err={}.\n'.format(auth_id, err))
                return self.write_json(err)

            if ops_auth['u_id'] != user_info['id']:
                log.e('user of auth-info is {}, not current login user {}.\n'.format(ops_auth['u_id'], user_info['id']))
                return self.write_json(TPE_PRIVILEGE)

            policy_id = ops_auth['p_id']
            acc_id = ops_auth['a_id']
            host_id = ops_auth['h_id']

            err, policy_info = ops.get_by_id(policy_id)
            if err != TPE_OK:
                log.e('can not got ops policy info {}, err={}.\n'.format(policy_info, err))
                return self.write_json(err)

            err, acc_info = account.get_account_info(acc_id)
            if err != TPE_OK:
                log.e('can not got account info {}, err={}.\n'.format(acc_id, err))
                return self.write_json(err)

            if acc_info['protocol_type'] == TP_PROTOCOL_TYPE_RDP:
                acc_info['protocol_flag'] = policy_info['flag_rdp']
            elif acc_info['protocol_type'] == TP_PROTOCOL_TYPE_SSH:
                acc_info['protocol_flag'] = policy_info['flag_ssh']
            elif acc_info['protocol_type'] == TP_PROTOCOL_TYPE_TELNET:
                acc_info['protocol_flag'] = policy_info['flag_telnet']
            else:
                acc_info['protocol_flag'] = 0
            acc_info['record_flag'] = policy_info['flag_record']

        else:
            # ???uni_id??????????????????????????????token??????????????????????????????????????????????????????
            if (user_info['privilege'] & TP_PRIVILEGE_OPS_AUZ) == 0:
                log.e('user privilege {} not fit require {}.\n'.format(user_info.privilege, TP_PRIVILEGE_OPS_AUZ))
                return self.write_json(TPE_PRIVILEGE)

            acc_id = token_info['acc_id']
            err, acc_info = account.get_account_info(acc_id)
            if err != TPE_OK:
                log.e('can not got account info {}, err={}.\n'.format(acc_id, err))
                return self.write_json(err)

            host_id = acc_info['host_id']
            acc_info['protocol_flag'] = TP_FLAG_ALL
            acc_info['record_flag'] = TP_FLAG_ALL

        # ???????????????????????????????????????????????????IP??????????????????????????????????????????????????????IP+?????????
        err, host_info = host.get_host_info(host_id)
        if err != TPE_OK:
            log.e('can not got host info {}, err={}.\n'.format(host_id, err))
            return self.write_json(err)

        conn_info['host_id'] = host_id
        conn_info['host_ip'] = host_info['ip']
        if len(host_info['router_ip']) > 0:
            conn_info['conn_ip'] = host_info['router_ip']
            conn_info['conn_port'] = host_info['router_port']
        else:
            conn_info['conn_ip'] = host_info['ip']
            conn_info['conn_port'] = acc_info['protocol_port']

        conn_info['acc_id'] = acc_id
        conn_info['acc_username'] = acc_info['username']
        conn_info['username_prompt'] = acc_info['username_prompt']
        conn_info['password_prompt'] = acc_info['password_prompt']
        conn_info['protocol_flag'] = acc_info['protocol_flag']
        conn_info['record_flag'] = acc_info['record_flag']

        conn_info['protocol_type'] = acc_info['protocol_type']
        # todo: how to set protocol_sub_type
        conn_info['protocol_sub_type'] = 0  # _protocol_sub_type

        conn_info['auth_type'] = acc_info['auth_type']
        if acc_info['auth_type'] == TP_AUTH_TYPE_PASSWORD:
            conn_info['acc_secret'] = acc_info['password']
        elif acc_info['auth_type'] == TP_AUTH_TYPE_PRIVATE_KEY:
            conn_info['acc_secret'] = acc_info['pri_key']
        else:
            conn_info['acc_secret'] = ''

        conn_id = tp_unique_id()

        # log.v('CONN-INFO:', conn_info)
        tp_session().set('tmp-conn-info-{}'.format(conn_id), conn_info, 10)

        req = {'method': 'request_session', 'param': {'conn_id': conn_id}}
        _yr = core_service_async_post_http(req)
        _code, ret_data = yield _yr
        if _code != TPE_OK:
            log.e('can not request session from core-server, err={}.\n'.format(err))
            return self.write_json(_code)
        if ret_data is None:
            log.e('request session from core-server but got nothing.\n')
            return self.write_json(TPE_FAILED, '??????????????????????????????ID??????')

        if 'sid' not in ret_data:
            log.e('request session from core-server but got invalid data.\n')
            return self.write_json(TPE_FAILED, '????????????????????????ID?????????????????????')

        return self.write_json(TPE_OK, data={'sid': ret_data['sid']})

    def _session_begin(self, param):
        try:
            _sid = param['sid']
            _user_id = param['user_id']
            _host_id = param['host_id']
            _account_id = param['acc_id']
            _user_name = param['user_username']
            _acc_name = param['acc_username']
            _host_ip = param['host_ip']
            _conn_ip = param['conn_ip']
            _conn_port = param['conn_port']
            _client_ip = param['client_ip']
            _auth_type = param['auth_type']
            _protocol_type = param['protocol_type']
            _protocol_sub_type = param['protocol_sub_type']
        except IndexError:
            return self.write_json(TPE_PARAM)

        err, record_id = record.session_begin(_sid, _user_id, _host_id, _account_id, _user_name, _acc_name, _host_ip, _conn_ip, _conn_port, _client_ip, _auth_type, _protocol_type, _protocol_sub_type)
        if err != TPE_OK:
            return self.write_json(err, message='can not write database.')
        else:
            tp_stats().conn_counter_change(1)
            return self.write_json(TPE_OK, data={'rid': record_id})

    def _session_update(self, param):
        try:
            rid = param['rid']
            protocol_sub_type = param['protocol_sub_type']
            code = param['code']
        except:
            return self.write_json(TPE_PARAM)
        if 'rid' not in param or 'code' not in param:
            return self.write_json(TPE_PARAM)

        if not record.session_update(rid, protocol_sub_type, code):
            return self.write_json(TPE_DATABASE, 'can not write database.')
        else:
            return self.write_json(TPE_OK)

    def _session_end(self, param):
        if 'rid' not in param or 'code' not in param:
            return self.write_json(TPE_PARAM, message='invalid request.')

        if not record.session_end(param['rid'], param['code']):
            return self.write_json(TPE_DATABASE, 'can not write database.')
        else:
            tp_stats().conn_counter_change(-1)
            return self.write_json(TPE_OK)

    def _register_core(self, param):
        # ??????core??????????????????????????????????????????????????????????????????????????????????????????????????????
        record.session_fix()

        if 'rpc' not in param:
            return self.write_json(TPE_PARAM, 'invalid param.')

        tp_cfg().common.core_server_rpc = param['rpc']

        # ??????core?????????????????????
        req = {'method': 'get_config', 'param': []}
        _yr = core_service_async_post_http(req)
        code, ret_data = yield _yr
        if code != TPE_OK:
            return self.write_json(code, 'get config from core-service failed.')

        log.d('update base server config info.\n')
        tp_cfg().update_core(ret_data)

        # ???????????????????????????????????????
        req = {'method': 'set_runtime_config', 'param': {'noop_timeout': tp_cfg().sys.session.noop_timeout}}
        _yr = core_service_async_post_http(req)
        code, ret_data = yield _yr
        if code != TPE_OK:
            return self.write_json(code, 'set runtime-config to core-service failed.')

        return self.write_json(TPE_OK)

    def _exit(self):
        # set exit flag.
        return self.write_json(TPE_OK)
