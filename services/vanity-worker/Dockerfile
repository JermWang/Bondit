FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

# Copy source
COPY src/ ./src/

# Build
RUN npm run build

# Start the worker
CMD ["node", "dist/index.js"]
