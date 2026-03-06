FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY index.js .

# Start the worker
CMD ["node", "index.js"]
