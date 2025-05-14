FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY . .

# Set environment to production
ENV NODE_ENV production

# Expose the port your app runs on
EXPOSE 5000

# Command to start your application
CMD ["node", "dist/index.js"]
