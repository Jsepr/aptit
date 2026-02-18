# Use official Node image
FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Create placeholder env file for build
RUN echo "GEMINI_API_KEY=PLACEHOLDER" >> ./.env

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . ./

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
