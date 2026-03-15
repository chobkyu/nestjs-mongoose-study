# 스키마 인덱스 상세 설명

프로젝트에 추가한 MongoDB 인덱스가 무엇을 의미하고, 어떤 쿼리에서 쓰이는지 정리한 문서.

---

## 인덱스가 뭔지 (한 줄 요약)

**인덱스 = “목차”**. 컬렉션 전체를 매번 훑지 않고, 조건/정렬에 맞는 문서를 빠르게 찾기 위해 필드(또는 필드 조합)별로 만든 자료 구조.

- 인덱스 없음: 쿼리할 때마다 **전체 스캔** (Collection Scan)
- 인덱스 있음: 해당 필드 기준으로 **빠르게 찾기** (Index Scan)

대신 인덱스는 **저장 공간**을 쓰고, **쓰기(insert/update/delete)** 할 때마다 인덱스도 갱신해야 해서 쓰기가 조금 무거워진다. 보통 읽기가 많은 게시판/검색에는 인덱스가 유리하다.

---

## 숫자 1, -1 의 의미 (정렬 방향)

일반 인덱스에서 `1`과 `-1`은 **그 필드를 어떤 순서로 정렬해 두었는지**를 의미한다.

| 값 | 의미 | 예시 (createdAt 기준) |
|----|------|------------------------|
| `1`  | 오름차순 (Ascending)  | 과거 → 최근 (오래된 글 먼저) |
| `-1` | 내림차순 (Descending) | 최근 → 과거 (최신 글 먼저) |

**단순 조회**만 할 때는 1이든 -1이든 “해당 필드로 빠르게 찾을 수 있다”는 점은 같다.  
차이는 **정렬(sort)** 할 때 나타난다.

- `sort({ createdAt: -1 })` → **createdAt 내림차순 인덱스**가 있으면, 이미 그 순서로 저장돼 있어서 정렬 비용이 거의 없음.
- 반대로 `sort({ createdAt: 1 })`만 쓰면, `createdAt: -1` 인덱스를 타더라도 정렬을 한 번 더 해야 할 수 있음.

그래서 “목록은 보통 최신순”이면 `createdAt: -1` 인덱스를 거는 게 맞다.

---

## Post 스키마 인덱스

### 1. `PostSchema.index({ createdAt: -1 })`

```ts
PostSchema.index({ createdAt: -1 });
```

- **의미:** `createdAt` 필드 기준 **내림차순** 인덱스 (최신이 앞으로).
- **타는 쿼리 예:**
  - `find().sort({ createdAt: -1 })`  → 목록 최신순
  - `find().sort({ createdAt: -1 }).limit(10)`  → 최신 10개
  - 페이지네이션: `find().sort({ createdAt: -1 }).skip(n).limit(m)`
- **왜 쓰나:** 게시글 목록을 “최신순”으로 자주 가져오니까, 이 정렬을 인덱스 순서 그대로 쓰면 빠르게 처리할 수 있음.
- **단일 필드 인덱스**라서 “createdAt이 OO인 문서 찾기” 같은 조건에도 사용 가능 (예: 특정 기간 조회).

---

### 2. `PostSchema.index({ title: 'text', content: 'text' })`

```ts
PostSchema.index({ title: 'text', content: 'text' });
```

- **의미:** `title`과 `content`를 합쳐서 만든 **텍스트 검색용 인덱스** (Full-Text Index).
- **타는 쿼리 예:**
  - `find({ $text: { $search: "키워드" } })`  → 제목/내용에 “키워드”가 포함된 문서 검색.
- **특징:**
  - `'text'`는 “이 필드를 텍스트 검색용으로 인덱싱한다”는 뜻.
  - 한 컬렉션에 **텍스트 인덱스는 하나만** 둘 수 있음 (지금은 title+content를 한 번에 묶은 compound text index).
  - 단어 단위로 쪼개서 검색하고, 불용어 제거, 어근 추출 등이 들어갈 수 있어서, 단순 `regex`보다 검색에 적합함.
- **우리 코드:** `posts.service.ts`의 `search()`에서 `$text`, `$search`를 쓰고 있고, `score: { $meta: 'textScore' }`로 관련도 점수를 받아서 정렬하고 있음.

---

### 3. `PostSchema.index({ author: 1, createdAt: -1 })`

```ts
PostSchema.index({ author: 1, createdAt: -1 });
```

- **의미:** **복합 인덱스(Compound Index)**.
  - 먼저 `author` 오름차순,
  - 그 다음 같은 author 안에서는 `createdAt` 내림차순.
- **타는 쿼리 예:**
  - “특정 작성자의 글만 최신순” → `find({ author: "철수" }).sort({ createdAt: -1 })`
  - `find({ author: "철수" })` 만 써도, 정렬은 나중에 `createdAt: -1`로 하면 이 인덱스를 활용 가능.
- **순서가 중요한 이유:**  
  MongoDB 복합 인덱스는 **왼쪽부터** 사용된다.
  - `author`로 먼저 걸러야 `author + createdAt` 인덱스가 잘 먹음.
  - `find({ createdAt: { $gte: ... } })` 처럼 author 없이 createdAt만 쓰면 이 인덱스는 비효율적이거나 안 탈 수 있음.
- **용도:** “작성자별 글 목록”, “내가 쓴 글 최신순” 같은 API를 나중에 넣을 때 유리.

---

## Comment 스키마 인덱스

### 4. `CommentSchema.index({ post: 1 })`

```ts
CommentSchema.index({ post: 1 });
```

- **의미:** `post` 필드(ObjectId) 기준 **오름차순** 인덱스.
- **타는 쿼리 예:**
  - `find({ post: postId })`  → “이 게시글에 달린 댓글만 조회”
  - `find({ post: postId }).sort({ createdAt: 1 })`  → 같은 post 안에서 생성일 오름차순 (옛 댓글 먼저).
- **왜 쓰나:** 댓글 조회는 항상 “특정 post에 대한 댓글”이라, `post`로 조건을 거는 쿼리가 많음. 이 필드에 인덱스가 있으면 해당 post의 댓글만 빠르게 찾을 수 있음.
- **참고:** `post`는 다른 컬렉션(Post)을 가리키는 참조 키라서, 이런 필드에 인덱스를 거는 건 RDB의 “외래키 인덱스”와 비슷한 역할이다.

---

## 요약 표

| 스키마  | 인덱스 정의                         | 목적                     | 자주 쓰는 쿼리 |
|--------|--------------------------------------|--------------------------|----------------|
| Post   | `{ createdAt: -1 }`                 | 목록 최신순 정렬         | `find().sort({ createdAt: -1 })` |
| Post   | `{ title: 'text', content: 'text' }` | 제목/내용 검색           | `find({ $text: { $search: "..." } })` |
| Post   | `{ author: 1, createdAt: -1 }`        | 작성자별 + 최신순        | `find({ author }).sort({ createdAt: -1 })` |
| Comment| `{ post: 1 }`                        | 게시글별 댓글 조회       | `find({ post: postId })` |

---

## 인덱스 확인하는 방법

MongoDB 셸 또는 Mongo Express에서:

```js
db.posts.getIndexes()
db.comments.getIndexes()
```

앱을 한 번 실행한 뒤에 위 명령을 치면, Mongoose가 스키마를 로드하면서 등록한 인덱스들이 보인다.  
(이미 같은 이름/정의의 인덱스가 있으면 새로 만들지 않고 재사용한다.)

---

정리하면: **1/-1은 정렬 방향**, **'text'는 전문 검색용**, **복합 인덱스는 조건·정렬 순서를 자주 쓰는 쿼리에 맞춰 설계**하면 된다.
