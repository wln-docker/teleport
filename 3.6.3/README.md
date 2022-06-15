#### 放入TP助手安装程序
将TP助手安装程序放到`/usr/local/teleport/data/assist`录下，TP-WEB界面上的下载链接会指向这里。

#### 改造`main.py`文件
修改`_do_install(self)`函数
```
        while True:
            cc.v('')
            self._install_path = self._prompt_input('Set installation path', self._def_install_path)
            _use_anyway = False
            if os.path.exists(self._install_path):
                while True:
                    cc.v('')
                    x = self._prompt_choice(
                        'The target path `{}` has already exists,\ndo you want to use it anyway?'.format(
                            self._install_path), [('Yes', 0, True), ('No', 0, False)])
                    if x in ['y', 'yes']:
                        _use_anyway = True
                        break
                    elif x in ['n', 'no']:
                        break

                if _use_anyway:
                    break
            else:
                break

        self._fix_path()
```
为
```
        self._install_path = self._def_install_path
        _use_anyway = True

        self._fix_path()
```
