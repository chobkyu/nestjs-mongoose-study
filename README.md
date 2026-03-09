# NestJS + Mongoose Study

NestJS와 MongoDB(Mongoose)를 사용한 스터디 프로젝트.

## 실행 방법

### 1. MongoDB 실행 (Docker)

```bash
docker compose up -d
```

- MongoDB: `localhost:27017`
- Mongo Express (DB 관리 UI): `http://localhost:8081`

### 2. NestJS 서버 실행

```bash
npm run start:dev
```

서버: `http://localhost:3000`

## API 엔드포인트

| Method | URL          | Description    |
| ------ | ------------ | -------------- |
| POST   | /cats        | 고양이 생성    |
| GET    | /cats        | 전체 조회      |
| GET    | /cats/:id    | 단건 조회      |
| PATCH  | /cats/:id    | 수정           |
| DELETE | /cats/:id    | 삭제           |

### 요청 예시

```bash
# 생성
curl -X POST http://localhost:3000/cats \
  -H "Content-Type: application/json" \
  -d '{"name": "나비", "age": 3, "breed": "코리안숏헤어"}'

# 전체 조회
curl http://localhost:3000/cats
```

## 프로젝트 구조

```
src/
├── cats/
│   ├── dto/
│   │   ├── create-cat.dto.ts
│   │   └── update-cat.dto.ts
│   ├── schemas/
│   │   └── cat.schema.ts
│   ├── cats.controller.ts
│   ├── cats.module.ts
│   └── cats.service.ts
├── app.module.ts
└── main.ts
```

## 종료

```bash
docker compose down
```

데이터 볼륨까지 삭제하려면:

```bash
docker compose down -v
```
