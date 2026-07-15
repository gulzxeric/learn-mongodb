# 第 5 周：Express 博客 CMS API

## 本周目标

用 **Express (Node.js)** 复刻第 4 周的 FastAPI 博客 CMS，对比 Python 和 JavaScript 两种生态的写法差异。

## 技术栈

| 层 | 技术 |
|---|------|
| Web 框架 | Express |
| 数据库驱动 | mongodb 原生驱动 |
| 运行 | node |
| ES 模块 | `"type": "module"`（使用 `import`/`export`） |

## 目录结构

```
week-05-express/
├── README.md
├── package.json
├── .env
├── src/
│   ├── index.js           ← 入口：Express 应用 + 路由注册
│   ├── config.js          ← 配置管理
│   ├── db.js              ← MongoDB 连接管理
│   ├── seed.js            ← 种子数据
│   └── routes/
│       ├── tags.js
│       ├── categories.js
│       ├── users.js
│       ├── posts.js
│       ├── comments.js
│       └── stats.js
```

## 执行顺序

```bash
npm install                # 装依赖
npm run seed               # 灌种子数据
npm run dev                # 启动（--watch 热重载）
# 访问 http://localhost:3000
```

---

## Step 1：对比 FastAPI vs Express

先看最核心的区别：

| 概念 | FastAPI (Python) | Express (Node.js) |
|------|-----------------|-------------------|
| 框架 | FastAPI | Express |
| 服务端 | uvicorn | 内置 HTTP server |
| JSON 序列化 | Pydantic | `res.json()` |
| 请求体 | Pydantic 模型 | `req.body`（需 middleware） |
| 类型校验 | 自动 | 无（需 Joi/Zod） |
| API 文档 | 自动 Swagger | 无（需 swagger-jsdoc） |
| 异步 | `async def` | `async/await` |
| 路由 | 装饰器 `@router.get()` | 链式 `router.get()` |

### Hello World 对比

```python
# FastAPI
@app.get("/tags")
def list_tags():
    return [{"id": "1", "name": "Python"}]
```

```javascript
// Express
router.get("/", async (req, res) => {
  res.json([{ id: "1", name: "Python" }]);
});
```

Express 需要手动调用 `res.json()` 返回 JSON，FastAPI 直接 `return` 即可。

---

## Step 2：package.json

```json
{
  "name": "blog-cms-express",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "seed": "node src/seed.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "mongodb": "^6.8.0",
    "dotenv": "^16.4.5"
  }
}
```

- `"type": "module"` = 使用 ES Module 语法（`import`/`export`，不是 `require`）
- `"dev": "node --watch"` = Node 18+ 自带热重载（不需要 nodemon）
- `mongodb` = MongoDB 原生驱动（不是 mongoose）

---

## Step 3：配置和数据库

### config.js

```javascript
import "dotenv/config";

export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
export const DATABASE_NAME = process.env.DATABASE_NAME || "blog";
export const PORT = parseInt(process.env.PORT || "3000");
```

### db.js

```javascript
import { MongoClient } from "mongodb";
import { MONGO_URI, DATABASE_NAME } from "./config.js";

const client = new MongoClient(MONGO_URI);

export function getDb() {
  return client.db(DATABASE_NAME);
}

export async function connectDb() {
  await client.connect();
  await client.db().admin().command({ ping: 1 });
  console.log("MongoDB connected");
}

export async function closeDb() {
  await client.close();
}
```

### 和 FastAPI 的区别

| | FastAPI | Express |
|--|---------|---------|
| 启动连接 | 自动 lazy | 手动 `connectDb()` |
| 获取 db | `get_db()` 函数 | `getDb()` 函数 |
| 全局变量 | Python 模块级 | JS 模块级 |

Express 没有 FastAPI 的 `lifespan` 机制，启动和关闭手动在 `index.js` 里控制。

---

## Step 4：入口文件 index.js

```javascript
import express from "express";

const app = express();

app.use(express.json());    // 解析请求体 JSON（FastAPI 自动做）
app.use("/tags", tagsRouter);
// ...

app.listen(PORT, () => console.log(`Running on :${PORT}`));
```

`express.json()` 是 Express 解析 `req.body` 的中间件——如果没有这一行，`req.body` 会一直是 `undefined`。

---

## Step 5：Tags 路由（最简单的 CRUD）

```javascript
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();
  const tags = await db.collection("tags").find().sort({ name: 1 }).toArray();
  res.json(tags.map(t => ({ id: t._id.toString(), name: t.name })));
});
```

### FastAPI vs Express 对比

| | FastAPI | Express |
|--|---------|---------|
| 路径 | `prefix="/tags"` | `app.use("/tags", router)` |
| handler | `def list_tags()` | `(req, res) => {}` |
| 参数 | 函数参数 | `req.params` / `req.query` |
| 返回 | `return [...]` | `res.json([...])` |
| ID 判断 | `if not ObjectId.is_valid(...)` | `if (!ObjectId.isValid(...))` |
| ObjectId 构造 | `ObjectId(tag_id)` | `new ObjectId(req.params.id)` |

### MongoDB Driver API 对比

| 操作 | pymongo (Python) | mongodb (Node.js) |
|------|-----------------|-------------------|
| 查询 | `find().toArray()` | `find().toArray()` |
| 查一个 | `find_one({})` | `findOne({})` |
| 插入 | `insert_one({})` | `insertOne({})` |
| 更新 | `update_one({}, {$set})` | `updateOne({}, {$set})` |
| 删除 | `delete_one({})` | `deleteOne({})` |
| ObjectId | `ObjectId(...)` | `new ObjectId(...)` |

**规律：** MongoDB 驱动 API 几乎一样，只是 Python 用下划线命名，JS 用驼峰。

---

## 接口速查表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /tags | 标签列表 |
| GET | /tags/{id} | 标签详情 |
| POST | /tags | 创建标签 |
| PUT | /tags/{id} | 更新标签 |
| DELETE | /tags/{id} | 删除标签 |
| GET | /categories | 分类列表 |
| GET | /categories/{id} | 分类详情 |
| POST | /categories | 创建分类 |
| PUT | /categories/{id} | 更新分类 |
| DELETE | /categories/{id} | 删除分类 |
| GET | /users | 用户列表 |
| GET | /users/{id} | 用户详情 |
| POST | /users | 创建用户 |
| PUT | /users/{id} | 更新用户 |
| DELETE | /users/{id} | 删除用户 |
| GET | /posts | 文章列表（分页+过滤） |
| GET | /posts/{id} | 文章详情 |
| POST | /posts | 创建文章 |
| PUT | /posts/{id} | 更新文章 |
| DELETE | /posts/{id} | 删除文章 |
| GET | /comments | 评论列表 |
| GET | /comments/{id} | 评论详情 |
| POST | /comments | 创建评论 |
| DELETE | /comments/{id} | 删除评论 |
| GET | /stats/tag-cloud | 标签云 |
| GET | /stats/author-ranking | 作者排行 |
| GET | /stats/category-summary | 分类统计 |
| GET | /stats/dashboard | 综合看板 |

---

## 本周总结

### FastAPI vs Express 核心差异

**1. 写法风格**

```python
# Python：类型先声明，自动校验
def create_tag(body: TagCreate):    # FastAPI 自动解析请求体
    ...
```

```javascript
// JS：手动取，手动校验
router.post("/", (req, res) => {
  const name = req.body.name;       // 手动从请求体取值
  if (!name) return res.status(400).json(...)  // 手动校验
  ...
});
```

**2. JSON 处理**

```python
# Python：直接 return
return TagResponse(**tag)
```

```javascript
// JS：显式调用 res.json()
res.json({ id: tag._id.toString(), name: tag.name })
```

**3. ObjectId 处理**

```python
# Python
ObjectId(tag_id)          # 函数调用
result.inserted_id        # 属性
str(object_id)            # 转字符串
```

```javascript
// JavaScript
new ObjectId(req.params.id)   // new 关键字
result.insertedId             // 驼峰命名
object_id.toString()          // 转字符串
```

**4. 异步**

```python
# Python
async def get_tags():     # 可选 async
    ...
```

```javascript
// JavaScript
router.get("/", async (req, res) => {  // Express 3 必须 async
    ...
});
```

### 你学到了什么

1. Express 项目结构和路由组织
2. mongodb 原生驱动操作（API 几乎和 pymongo 一样）
3. FastAPI vs Express 的写法差异
4. 同一套 MongoDB 数据模型，两种语言实现
5. ES Module (`import`/`export`) vs CommonJS (`require`)
