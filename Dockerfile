FROM node:24

WORKDIR /usr/src/app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --ignore-engines

# Copy source code
COPY . .

# Build the app - run with verbose to debug
RUN node node_modules/@nestjs/cli/bin/nest.js build --verbose 2>&1

# Prune dev dependencies
RUN npm prune --omit=dev

# Expose port
ARG PORT=3000
EXPOSE $PORT

# Start the app
CMD [ "node", "dist/main.js" ]
