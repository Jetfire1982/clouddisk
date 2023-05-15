FROM node:16-alpine

WORKDIR /app

COPY package*.json  ./

RUN npm ci

COPY . .

ENV P0RT=5000

EXPOSE $PORT

CMD ["npm", "start"]