FROM node:20-slim
WORKDIR /app
COPY package.json ./
# Only production deps in the runtime image.
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
EXPOSE 8083
CMD ["node", "index.js"]
