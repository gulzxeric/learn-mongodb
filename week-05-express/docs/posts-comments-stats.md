# Week 5：Posts + Comments + Stats 详解

> 三个文件的完整解读，对比 week 4 FastAPI 版本。

---

## 一、Posts — 最复杂的路由

### 完整文件

```javascript
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();
```

### 1. 列表 — GET /posts（分页 + 过滤）

```javascript
router.get("/", async (req, res) => {
  const db = getDb();
  const { page = 1, page_size = 10, author_id, category_id, tag_id, published, search } = req.query;
```

**`req.query`** = 查询参数。访问 `/posts?page=2&page_size=5&author_id=xxx` 时：

```javascript
req.query = {
  page: "2",
  page_size: "5",
  author_id: "6a54...",
}
```

所有值都是**字符串**（Express 不会帮你转数字）。

---

**分页参数处理：**

```javascript
const pageNum = Math.max(1, parseInt(page));           // 至少 1
const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));  // 1~100
```

**为什么？** 用户可能传 `page=0`、`page=-1` 或 `page=abc`。`parseInt` 把字符串转数字，`Math.max`/`Math.min` 限制范围。

**对比 FastAPI 版本：**

```python
# Python：FastAPI 的 Query 自动做类型转换和校验
page: int = Query(1, ge=1)                    # 一行搞定
page_size: int = Query(10, ge=1, le=100)
```

```javascript
// JS：全部手动
const pageNum = Math.max(1, parseInt(page));  // 好几行
const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
```

---

**动态查询构造：**

```javascript
const query = {};
if (author_id)    query.authorId = new ObjectId(author_id);
if (category_id)  query.categoryId = new ObjectId(category_id);
if (tag_id)       query.tags = new ObjectId(tag_id);
if (published !== undefined) query.published = published === "true";
if (search)       query.$text = { $search: search };
```

**和 FastAPI 完全一样的逻辑：** 用户传了什么参数，就往 `query` 对象里加什么条件。

注意 `published`：用户 URL 传来的是 `"true"`（字符串），要转成 JS 布尔值。

---

**执行查询 + 分页：**

```javascript
const total = await db.collection("posts").countDocuments(query);

const posts = await db.collection("posts").find(query)
  .sort({ createdAt: -1 })
  .skip((pageNum - 1) * pageSize)
  .limit(pageSize)
  .toArray();
```

| 方法 | MongoDB (Node.js) | MongoDB (Python) |
|------|------------------|-----------------|
| 总条数 | `countDocuments(query)` | `count_documents(query)` |
| 排序 | `.sort({ createdAt: -1 })` | `.sort("createdAt", -1)` |
| 跳过 | `.skip(n)` | `.skip(n)` |
| 截取 | `.limit(n)` | `.limit(n)` |
| 执行 | `.toArray()` | 循环自动执行 |

---

**返回数据——手动转 ObjectId：**

```javascript
const items = posts.map(p => ({
  id: p._id.toString(),                  // ObjectId → 字符串
  authorId: p.authorId.toString(),
  categoryId: p.categoryId.toString(),
  tags: p.tags.map(t => t.toString()),    // 数组里的每个 ObjectId 都要转
  ...
}));

res.json({ items, total, page: pageNum, page_size: pageSize });
```

**这是 Express 最麻烦的地方。** FastAPI 用 Pydantic 自动处理了 `ObjectId` → `str` 的转换：

```python
# Python：Pydantic 自动转
class PostResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")     # PyObjectId 自动处理
    tags: list[PyObjectId]                  # 数组里的也自动转
```
```javascript
// JS：手动每条数据每个字段逐个 .toString()
res.json({
  id: p._id.toString(),
  tags: p.tags.map(t => t.toString()),
  ...
})
```

---

### 2. 详情 — GET /posts/:id

```javascript
router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id))
    return res.status(400).json({ detail: "Invalid post ID" });
  //       ^^^^^^ Express 里 return 不能漏！
```
**噩梦级 Bug：** 没 `return` 会怎样？

```javascript
// ❌ 没有 return：发送了 400 响应，但代码继续往下走
if (!ObjectId.isValid(req.params.id))
  res.status(400).json({ detail: "Invalid post ID" });  // 发了响应

// 继续执行到这里
const db = getDb();
const post = await db.collection("posts").findOne(...)
res.json(...)  // ❌ Error: Cannot set headers after they are sent
```

```javascript
// ✅ 有 return：发送响应后立即停止函数
if (!ObjectId.isValid(req.params.id))
  return res.status(400).json({ detail: "Invalid post ID" });
// return 让函数结束了，后面的代码不执行
```

**FastAPI 版本：**

```python
# Python：raise 自动终止，不存在"忘记 return"的问题
if not ObjectId.is_valid(tag_id):
    raise HTTPException(400, "Invalid tag ID")
# raise 后面的代码永远不会执行
```

---

### 3. 创建 — POST /posts

```javascript
router.post("/", async (req, res) => {
  const db = getDb();
  const body = req.body;       // 从请求体取值

  // 验证引用是否存在
  if (!await db.collection("users").findOne({ _id: new ObjectId(body.authorId) }))
    return res.status(400).json({ detail: "Author not found" });

  const doc = {
    title: body.title,
    authorId: new ObjectId(body.authorId),       // str → ObjectId
    categoryId: new ObjectId(body.categoryId),
    tags: (body.tags || []).map(t => new ObjectId(t)),
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("posts").insertOne(doc);
  const post = await db.collection("posts").findOne({ _id: result.insertedId });
```

**对比 FastAPI：**

| | Python | JS |
|--|--------|-----|
| 请求体 | `body: PostCreate`（自动校验） | `req.body`（手动取） |
| 默认值 | Pydantic 定义 | JS 手动 `\|\|` / `??` |
| 空值保护 | `Field(...)` 自动 | `(body.tags \|\| [])` 手动 |
| 字段过滤 | `.model_dump()` 只取定义字段 | 全部暴露，可能传入多余字段 |

**FastAPI 自动做了这些事：**

```python
class PostCreate(BaseModel):
    excerpt: Optional[str] = ""       # 不传就默认 ""
    tags: list[str] = []              # 不传就默认 []
    published: bool = True            # 不传就默认 True
```

```javascript
// Express 全要手动
excerpt: body.excerpt || "",
tags: (body.tags || []).map(...),
published: body.published !== undefined ? body.published : true,
```

---

### 4. 更新 — PUT /posts/:id

```javascript
router.put("/:id", async (req, res) => {
  ...
  // 只保留有值的字段
  const update = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.content !== undefined) update.content = body.content;
  if (body.categoryId !== undefined) update.categoryId = new ObjectId(body.categoryId);
  if (body.tags !== undefined) update.tags = body.tags.map(t => new ObjectId(t));

  if (Object.keys(update).length === 0)
    return res.status(400).json({ detail: "No fields to update" });
  update.updatedAt = new Date();

  const result = await db.collection("posts").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: update }
  );
```

**`Object.keys(update).length === 0`** = JS 里判断空对象的写法。

**和 FastAPI 一样的逻辑：** 把用户传了且不为 `undefined` 的字段收集起来，只更新这些字段。

---

## 二、Comments — 自动计数器

```javascript
router.post("/", async (req, res) => {
  const db = getDb();

  // 1. 验证引用
  if (!await db.collection("posts").findOne({ _id: new ObjectId(body.postId) }))
    return res.status(400).json({ detail: "Post not found" });

  // 2. 插入评论
  const doc = {
    postId: new ObjectId(body.postId),
    authorId: new ObjectId(body.authorId),
    body: body.body,
    createdAt: new Date(),
  };
  const result = await db.collection("comments").insertOne(doc);

  // 3. 评论数 +1
  await db.collection("posts").updateOne(
    { _id: new ObjectId(body.postId) },
    { $inc: { commentCount: 1 } }
  );
```

**删除时：**

```javascript
router.delete("/:id", async (req, res) => {
  // 1. 先查到评论（为了拿 postId）
  const comment = await db.collection("comments").findOne(...)

  // 2. 文章评论数 -1
  await db.collection("posts").updateOne(
    { _id: comment.postId },
    { $inc: { commentCount: -1 } }
  );

  // 3. 删评论
  await db.collection("comments").deleteOne(...)
});
```

**和 FastAPI 一模一样**，连函数名都一样（`insertOne` / `updateOne` / `deleteOne`），只是 Python 是下划线，JS 是驼峰。

---

## 三、Stats — 聚合管道

```javascript
router.get("/tag-cloud", async (req, res) => {
  const db = getDb();
  const pipeline = [
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ];
  const results = await db.collection("posts").aggregate(pipeline).toArray();

  // 回填标签名称
  const tagIds = results.map(r => r._id);
  const tags = {};
  for (const t of await db.collection("tags").find({ _id: { $in: tagIds } }).toArray()) {
    tags[t._id.toString()] = t.name;
  }

  res.json(results.map(r => ({
    tag_id: r._id.toString(),
    name: tags[r._id.toString()] || "unknown",
    count: r.count,
  })));
});
```

**聚合管道语法完全一样**，MongoDB 的 pipeline 是 JSON，所以 Python 和 JS 写出来完全一致。

**关键区别：结果处理**

```python
# Python：用 dict comprehension
tags = {t["_id"]: t["name"] for t in db.tags.find({"_id": {"$in": tag_ids}})}
```

```javascript
// JS：手动建对象，for...of 循环填充
const tags = {};
for (const t of await db.collection("tags").find({ _id: { $in: tagIds } }).toArray()) {
  tags[t._id.toString()] = t.name;
}
```

---

## 四、三大差异总结

### 1. 对象 vs 字典

| | Python | JavaScript |
|--|--------|-----------|
| ObjectId 构造 | `ObjectId(x)` | `new ObjectId(x)` |
| ObjectId 转字符串 | `str(x)` | `x.toString()` |
| 判断 ID 格式 | `ObjectId.is_valid(x)` | `ObjectId.isValid(x)` |
| 插入结果 ID | `result.inserted_id` | `result.insertedId` |
| 匹配数 | `result.matched_count` | `result.matchedCount` |

### 2. 数据校验

| | Python | JavaScript |
|--|--------|-----------|
| 请求体 | 自动到参数 | `req.body` |
| 类型检查 | Pydantic 自动 | 手动 `typeof`/`===` |
| 默认值 | Field 定义 | 手动 `\|\|` |
| 额外字段 | `.model_dump()` 过滤 | 全暴露 |

### 3. 响应处理

| | Python | JavaScript |
|--|--------|-----------|
| 返回 JSON | `return {...}` | `res.json({...})` |
| 状态码 | `status_code=201` | `res.status(201).json(...)` |
| 204 删除 | `status_code=204` | `res.status(204).send()` |
| 错误终止 | `raise` | `return res.status(400).json(...)` |
| ObjectId 序列化 | Pydantic 自动 | 手动 `.toString()` 每个字段 |

---

## 五、一个请求的完整流程对比

```
FastAPI:                            Express:
POST /posts {"title": "..."}        POST /posts {"title": "..."}
        ↓                                    ↓
uvicorn 接收请求                    Express 接收请求
        ↓                                    ↓
FastAPI 解析到 PostCreate +         手动 req.body 取值
类型校验 + 默认值                    没有任何校验
        ↓                                    ↓
调用 create_tag(body)               路由函数执行
        ↓                                    ↓
返回 PostResponse(**tag)            手动构造响应 + res.json()
自动转 ObjectId → str              手动 .toString() 每个字段
自动 JSON 序列化                    res.json() 序列化
```
