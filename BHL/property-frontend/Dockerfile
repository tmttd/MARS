# 빌드 스테이지
FROM node:18 as build

WORKDIR /app

# 먼저 package.json과 config-overrides.js 파일을 복사
COPY package*.json ./
COPY config-overrides.js ./

# 필요한 패키지 설치
RUN npm install
RUN npm install react-app-rewired --save-dev
RUN npm install customize-cra --save-dev
RUN npm install os-browserify --save-dev
RUN npm install react-router-dom

# 나머지 소스 코드 복사
COPY . .

# 빌드 실행
RUN npm run build

# Nginx 설정
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 