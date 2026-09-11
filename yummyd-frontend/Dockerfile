# Stage 1: Build
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# 빌드된 dist 폴더를 nginx의 html 경로로 복사
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Nginx 설정 파일 추가 (API 프록시 및 SPA 라우팅 지원)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
