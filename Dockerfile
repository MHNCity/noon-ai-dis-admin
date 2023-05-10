## Dockerfile for noonai-dis-node
FROM node:18.3.0-alpine

RUN apk update && \
    apk add mysql-client
RUN mkdir -p /app/node
COPY . /app/

ENV LANG=ko_KR.UTF-8 \
    LANGUAGE=ko_KR.UTF-8

# Set the timezone in docker
RUN apk --no-cache add tzdata && \
        cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
        echo "Asia/Seoul" > /etc/timezone

WORKDIR /app/node
RUN npm install

EXPOSE 5000

CMD ["node", "index.js"]