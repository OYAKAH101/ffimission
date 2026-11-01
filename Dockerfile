# Builds the website, then runs the server which serves it. Works on Railway, Fly.io, a VPS, etc.
# Settings (MONGODB_URI, SESSION_SECRET, CREDENTIAL_KEY) come from environment variables.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/
RUN npm --prefix server install --omit=dev
COPY server server
COPY --from=build /app/dist dist
EXPOSE 5000
USER node
CMD ["node", "server/src/index.js"]
