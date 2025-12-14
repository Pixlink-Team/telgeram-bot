FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm install --frozen-lockfile
COPY src ./src
RUN pnpm build
EXPOSE 8081
CMD ["node", "dist/index.js"]
