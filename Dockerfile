# Cloud Run 部署用映像檔（取代 Zeabur 自動偵測）
# - Node 版本與 package.json engines 一致（24.x）
# - 依 yarn.lock 安裝，與 Zeabur 時期相同的依賴解析結果
# - 只裝 production 依賴，並以非 root 使用者執行
FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# 先複製 lockfile 再安裝，讓程式碼變動時能沿用依賴層快取
COPY package.json yarn.lock ./
RUN corepack enable \
  && yarn install --frozen-lockfile --production --non-interactive \
  && yarn cache clean

COPY index.js ./
COPY src ./src

USER node

# Cloud Run 會注入 PORT（預設 8080）；index.js 已讀 process.env.PORT
EXPOSE 8080
CMD ["node", "index.js"]
