FROM node:14
WORKDIR /opt/onefirewall/WCF-Agent-latest
COPY package.json app.js run.sh /opt/onefirewall/WCF-Agent-latest/
ADD app /opt/onefirewall/WCF-Agent-latest/app
WORKDIR /opt/onefirewall/WCF-Agent-latest
RUN npm install
CMD node app test


