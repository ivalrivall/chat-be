FROM oven/bun:latest AS base
WORKDIR /usr/src/app

# Copy manifest files so Bun can install dependencies (respects yarn.lock via --yarn)
COPY package.json yarn.lock ./

# Install dependencies with Bun using your existing yarn.lock
RUN bun install --yarn

# Copy application source
COPY . ./

ARG PORT=3000
ENV NODE_ENV=production

EXPOSE ${PORT}

# Run NestJS directly with Bun's TypeScript support (no separate tsc build step)
CMD [ "bun", "src/main.ts" ]
