FROM node:24 AS deps

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install --network-timeout 600000

FROM node:24 AS build

WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . ./

RUN yarn build:prod
RUN npm prune --omit=dev

FROM node:24

ARG PORT=3000

ENV NODE_ENV=production

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/dist /usr/src/app/dist
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules

COPY . /usr/src/app

EXPOSE $PORT

CMD [ "node", "dist/main.js" ]
