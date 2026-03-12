# MongoDB 학습 로드맵

NestJS + Mongoose 스터디에서 하나씩 추가해볼 항목 정리. 순서대로 진행해도 되고, 관심 있는 것부터 해도 됨.

---

## 1. 페이지네이션 (Pagination)

**배우는 것:** `skip`, `limit` 사용법. 목록 API에서 데이터를 잘라서 보내는 방법.

**목표:**
- `GET /posts?page=1&limit=10` 형태로 요청
- 응답에 `data`, `total`, `page`, `totalPages` 등 메타 정보 포함

**MongoDB 쿼리:**
```ts
this.postModel.find().skip((page - 1) * limit).limit(limit)
this.postModel.countDocuments()  // 전체 개수
```

**체크리스트:**
- [x] Posts 목록에 `page`, `limit` 쿼리 파라미터 적용
- [x] 응답 DTO/형식 정하기 (예: `{ data: [], meta: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }`)
- [ ] (선택) cursor 기반 페이지네이션 공부 후 비교

---

## 2. 인덱스 (Index)

**배우는 것:** 스키마에 인덱스 걸기. 조회 속도 개선, 검색용 text index.

**목표:**
- 자주 조회하는 필드에 인덱스 추가
- 제목/내용 검색을 위한 text index
- compound index (여러 필드 조합)

**Mongoose 예시:**
```ts
// 단일 필드
@Prop({ index: true })
createdAt: Date;

// 스키마 옵션으로
PostSchema.index({ createdAt: -1 });
PostSchema.index({ title: 'text', content: 'text' });
PostSchema.index({ author: 1, createdAt: -1 });
```

**체크리스트:**
- [ ] Post 스키마에 `createdAt` 인덱스 (목록 정렬용)
- [ ] Post에 title, content text index (검색 개선)
- [ ] Comment에 `post` 인덱스 (post별 댓글 조회용)
- [ ] (선택) `db.collection.getIndexes()` 로 생성된 인덱스 확인

---

## 3. Aggregation (집계 파이프라인)

**배우는 것:** `$match`, `$group`, `$lookup`, `$sort`, `$project` 등. SQL의 GROUP BY, JOIN에 해당.

**목표:**
- 게시글별 댓글 개수 한 번에 가져오기 (`$lookup` + `$addFields` 또는 `$group`)
- 작성자별 게시글 수 집계
- (선택) 일별 게시글 수 통계

**예시:**
```ts
this.postModel.aggregate([
  { $lookup: { from: 'comments', localField: '_id', foreignField: 'post', as: 'comments' } },
  { $addFields: { commentCount: { $size: '$comments' } } },
  { $sort: { createdAt: -1 } }
])
```

**체크리스트:**
- [ ] `$lookup`으로 Post + 댓글 개수 한 번에 조회하는 API 추가
- [ ] `$group`으로 author별 게시글 수 집계 API
- [ ] (선택) `$match` → `$group` → `$sort` 로 통계 API

---

## 4. populate()

**배우는 것:** Mongoose에서 참조(Reference)된 문서를 자동으로 채워넣는 방법. 지금은 수동으로 comments를 붙였는데, populate로 할 수 있음.

**목표:**
- Comment 스키마의 `post` 필드가 Post를 가리킬 때, `populate('post')`로 Post 내용 로드
- 반대로 Post 조회 시 연결된 Comment들을 `populate`로 로드 (또는 virtual populate)

**예시:**
```ts
this.commentModel.find().populate('post')
this.postModel.findById(id).populate({ path: 'comments', model: 'Comment' })
// Post 스키마에 comments 필드가 없으면 virtual 사용
```

**체크리스트:**
- [ ] Comment 조회 시 `.populate('post')` 적용해보기
- [ ] Post 스키마에 virtual으로 comments 연결 후 `populate('comments')` 로 단건 조회
- [ ] 기존 수동 조인과 비교해서 선택 기준 정리

---

## 5. Soft Delete (소프트 삭제)

**배우는 것:** 실제로 문서를 지우지 않고 `deletedAt` 필드로 “삭제됨” 표시. 복구, 감사(audit)에 유리.

**목표:**
- Post, Comment에 `deletedAt?: Date` 추가
- 삭제 시 `findByIdAndUpdate`로 `deletedAt: new Date()` 설정
- 조회 시 `find({ deletedAt: null })` 또는 `$ne: null` 제외

**체크리스트:**
- [ ] Post 스키마에 `deletedAt` 추가 (optional)
- [ ] Comment 스키마에 `deletedAt` 추가
- [ ] remove 메서드를 soft delete로 변경
- [ ] findAll, findOne 등에서 `deletedAt`이 null인 것만 조회
- [ ] (선택) 복구 API `PATCH /posts/:id/restore`

---

## 6. 스키마 옵션 (select, unique, index 등)

**배우는 것:** `@Prop` 옵션으로 기본값, 선택 로드, 유일값 제한 등.

**목표:**
- `select: false` → 기본 조회에서 제외 (예: 나중에 비밀번호 필드 쓸 때)
- `unique: true` → 중복 방지 (예: 이메일, 슬러그)
- `enum` → 특정 값만 허용
- `default` → 이미 사용 중이니 복습

**예시:**
```ts
@Prop({ select: false })
passwordHash: string;

@Prop({ unique: true })
slug: string;

@Prop({ enum: ['draft', 'published'] })
status: string;
```

**체크리스트:**
- [ ] Post에 `status: 'draft' | 'published'` enum 추가
- [ ] (선택) author 대신 user 참조 시 `select: false`인 필드 연습

---

## 7. 미들웨어 (Hooks: pre / post)

**배우는 것:** `save`, `remove` 전후에 실행되는 훅. 자동화된 로직 넣기.

**목표:**
- Post 삭제 시 해당 Post의 Comment 자동 삭제 (지금은 서비스에서 수동 처리 중)
- 저장 전 `updatedAt` 갱신 (이미 timestamps 쓰면 불필요)
- (선택) slug 자동 생성

**예시:**
```ts
PostSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  await this.model.db.model('Comment').deleteMany({ post: doc._id });
});
```

**체크리스트:**
- [ ] Post 스키마에 `findOneAndDelete` pre 훅으로 댓글 삭제 이관
- [ ] PostsService.remove에서 댓글 삭제 호출 제거
- [ ] (선택) pre save에서 slug 생성

---

## 8. .lean()

**배우는 것:** 조회 시 Mongoose Document 대신 일반 JS 객체로 반환. 읽기 전용 목록에서 성능/메모리 이점.

**목표:**
- 목록 조회(find, findAll)에 `.lean()` 적용
- 반환 타입 확인 (Document 메서드 없음)

**예시:**
```ts
this.postModel.find().sort({ createdAt: -1 }).lean().exec()
```

**체크리스트:**
- [ ] findAll 등 목록 API에 `.lean()` 적용
- [ ] 단건 조회 후 수정/저장할 때는 lean 쓰지 않기 (이미 Document 필요)

---

## 진행 상황 요약

| # | 항목            | 난이도 | 완료 |
|---|-----------------|--------|------|
| 1 | 페이지네이션    | ⭐     | ☑    |
| 2 | 인덱스          | ⭐⭐   | ☐    |
| 3 | Aggregation     | ⭐⭐⭐  | ☐    |
| 4 | populate()      | ⭐     | ☐    |
| 5 | Soft Delete     | ⭐     | ☐    |
| 6 | 스키마 옵션     | ⭐     | ☐    |
| 7 | 미들웨어(Hooks) | ⭐⭐   | ☐    |
| 8 | .lean()         | ⭐     | ☐    |

---

한 항목 끝날 때마다 위 표에 완료 체크하면 됨. 구현하다 막히면 해당 항목 이름으로 질문해도 됨.
