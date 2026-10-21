FROM node:20-alpine

WORKDIR /app

# npm ci : installation reproductible depuis le lockfile (décision 0003).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
