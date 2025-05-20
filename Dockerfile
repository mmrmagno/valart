FROM node:16-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy all files to the container
COPY . .

# Build React app
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Copy built files from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/server.js ./
COPY --from=build /app/package.json ./
COPY --from=build /app/.env.example ./.env
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/src ./src
COPY --from=build /app/gallery ./gallery

# Install only production dependencies
RUN npm install --only=production

# Expose the port the app runs on
EXPOSE 3001

# Command to run the app
CMD ["node", "server.js"]