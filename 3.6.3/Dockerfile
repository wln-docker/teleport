FROM debian:unstable-20200414-slim
LABEL Maintainer="Wlniao <wlniao@qq.com>" \
      Description="tp4a/teleport container on Alpine Linux."

ENV TP_VER=3.6.3-b2
RUN apt-get update && apt-get install -y procps && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /etc/localtime \
    && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime  

ADD bootstrap.sh /root/bootstrap.sh
ADD server /teleport-$TP_VER
ADD assist /usr/local/teleport/data/assist
RUN /bin/sh -c "chmod +x /root/bootstrap.sh \
    && chmod +x -R /teleport-$TP_VER \
    && /teleport-$TP_VER/setup.sh \
    && rm -rf /teleport-$TP_VER \
    && ln -s /usr/lib/x86_64-linux-gnu/libffi.so.7 /usr/lib/x86_64-linux-gnu/libffi.so.6"

ENTRYPOINT ["/root/bootstrap.sh"]