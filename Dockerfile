FROM node:14
RUN mkdir -p /opt/onefirewall/

WORKDIR /opt/onefirewall/WCF-Agent-latest
COPY package.json app.js /opt/onefirewall/WCF-Agent-latest/
ADD app /opt/onefirewall/WCF-Agent-latest/app
RUN mkdir -p /opt/onefirewall/WCF-Agent-latest/config/


WORKDIR /opt/onefirewall/WCF-Agent-latest
RUN npm install
RUN node app test
#CMD date && pwd &&ls -l /opt/onefirewall/WCF-Agent-latest/config/
