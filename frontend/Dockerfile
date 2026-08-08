FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the Vite app and serve it using a lightweight dev server or serve
# For dev environment, we can just use `npm run dev` with host exposure.
# In a real prod environment we'd build and use nginx.
CMD ["npm", "run", "dev", "--", "--host"]
