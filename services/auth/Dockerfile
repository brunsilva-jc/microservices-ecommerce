FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

FROM base AS development
ENV NODE_ENV=development
COPY package.json ./
RUN npm install
COPY . .
CMD ["dumb-init", "npm", "run", "dev"]

FROM base AS builder
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3001
CMD ["dumb-init", "node", "dist/index.js"]