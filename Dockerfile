# Use the official Playwright image which includes all browser dependencies
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Create placeholder env file for build
RUN echo "GEMINI_API_KEY=PLACEHOLDER" >> ./.env

# Install dependencies (Playwright browsers are already installed in the base image)
RUN npm install

# Copy the rest of the application
COPY . ./

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
