# Stage 1: Build the frontend, and install server dependencies
FROM node:22 AS builder

WORKDIR /app

# Copy all files from the current directory
COPY package.json package-lock.json ./

RUN echo "GEMINI_API_KEY=PLACEHOLDER" >> ./.env
RUN npm install
RUN npx -y playwright@1.58.2 install --with-deps

COPY . ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
