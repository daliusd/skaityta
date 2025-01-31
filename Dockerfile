FROM node:22-alpine AS base
RUN corepack enable yarn
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn workspaces focus --production

FROM base AS production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
