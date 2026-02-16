FROM node:22-slim AS build
WORKDIR /usr/src/app

# Copy only manifest files (do not copy .yarnrc.yml so container uses built-in Yarn)
COPY package.json yarn.lock ./

# Install dependencies with Yarn
RUN yarn install --ignore-engines

# Copy application source
COPY . ./

# Build the NestJS app
RUN yarn build:prod

FROM node:22-slim
WORKDIR /usr/src/app

ARG PORT=3000
ENV NODE_ENV=production

# Copy built artifacts and node_modules from build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY package.json ./

EXPOSE $PORT

# Start the app using Yarn script
CMD [ "yarn", "start:prod" ]
