FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Rebuild bcrypt for the correct architecture
RUN npm rebuild bcrypt

COPY . .

RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]