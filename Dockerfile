FROM node:14
RUN mkdir -p /opt/onefirewall/

WORKDIR /opt/onefirewall/WCF-Agent-latest
COPY package.json app.js run.sh run-app.sh /opt/onefirewall/WCF-Agent-latest/
ADD app /opt/onefirewall/WCF-Agent-latest/app
RUN touch /opt/onefirewall/feeds.csv
RUN mkdir -p /opt/onefirewall/WCF-Agent-latest/config/


WORKDIR /opt/onefirewall/WCF-Agent-latest
RUN npm install
RUN node app test
#CMD date && pwd &&ls -l /opt/onefirewall/WCF-Agent-latest/config/
