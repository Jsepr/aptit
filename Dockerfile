# Stage 1: Build the frontend, and install server dependencies
FROM node:22 AS builder

WORKDIR /app

# Copy all files from the current directory
COPY . ./
RUN echo "GEMINI_API_KEY=PLACEHOLDER" >> ./.env

# Install dependencies and build the app
WORKDIR /app
RUN mkdir -p dist
RUN bash -c 'if [ -f package.json ]; then npm install && npm run build; fi'


# Stage 2: Build the final server image
FROM node:22

WORKDIR /app

# Copy package.json and node_modules from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
