FROM nginx:1.27-alpine

ARG GIT_SHA=unknown
LABEL org.opencontainers.image.revision=$GIT_SHA

COPY default.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/

RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/default.conf \
  && find /usr/share/nginx/html -type d -exec chmod 755 {} + \
  && find /usr/share/nginx/html -type f -exec chmod 644 {} +
