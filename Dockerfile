## Dockerfile for noonai-dis-node
# FROM node:20.1.0-alpine
FROM node:slim

RUN apt update
RUN mkdir -p /app/node
RUN mkdir /app/node/logs
COPY . /app/

ENV LANG=ko_KR.UTF-8 \
    LANGUAGE=ko_KR.UTF-8

# Set the timezone in docker
RUN apt install tzdata && \
        cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
        echo "Asia/Seoul" > /etc/timezone

WORKDIR /app/node
RUN npm install
RUN chown -R node:node /app/node
RUN chmod 750 /app/node/logs
RUN chmod 750 /app/node/logs

EXPOSE 5000
USER node

CMD ["node", "index.js"]