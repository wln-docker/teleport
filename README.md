# Teleport 开源堡垒机
Teleport是一款简单易用的堡垒机系统，具有小巧、易用的特点，支持 RDP/SSH/SFTP/Telnet 协议的远程连接和审计管理。

### 启动容器
```
docker run -d --restart=always --name teleport \
 -v /mnt/teleport/etc:/usr/local/teleport/data/etc \
 -v /mnt/teleport/replay:/usr/local/teleport/data/replay \
 -p7190:7190 -p52089:52089 -p52189:52189 -p52389:52389 \
 ideploy/teleport:3.6.3-b2
```