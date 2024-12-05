# 빌드 스테이지
FROM node:18-alpine as build

WORKDIR /app

# 환경 변수 설정
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 스테이지
FROM nginx:alpine

# nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 파일 복사
COPY --from=build /app/build /usr/share/nginx/html

# 헬스체크를 위한 포트
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 