FROM node:20

WORKDIR /user/src/app

COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 8080

CMD npm run build && npm run start
