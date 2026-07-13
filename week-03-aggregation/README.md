# 第 3 周：聚合管道 + 高级查询

## 目录

| 文件 | 内容 |
|------|------|
| `00-seed-data.mongodb.js` | 种子数据（先跑这个） |
| `01-intro-and-match.mongodb.js` | 聚合管道入门：`$match` / `$sort` / `$project` |
| `02-group-and-accumulators.mongodb.js` | 分组统计：`$group` + 累加器 |
| `03-unwind.mongodb.js` | 数组展开：`$unwind`（标签云） |
| `04-practical-stats.mongodb.js` | 博客实战统计 |
| `05-text-search.mongodb.js` | 全文搜索：`$text` 索引 |
| `practice-01-02.mongodb.js` | 练习：`$match` / `$sort` / `$project` / `$group` |
| `practice-all.mongodb.js` | 综合练习 |

## 执行顺序

```
1. 00-seed-data.mongodb.js    ← 先插入更多数据
2. 01-intro-and-match.mongodb.js
3. 02-group-and-accumulators.mongodb.js
4. 03-unwind.mongodb.js
5. 04-practical-stats.mongodb.js
6. 05-text-search.mongodb.js
7. practice-01-02.mongodb.js
8. practice-all.mongodb.js
```

---

## 聚合管道概念

`.aggregate([])` 把多个 stage 串成管道，**上一个 stage 的输出是下一个 stage 的输入**。

```javascript
db.posts.aggregate([
  { $match: { published: true } },     // 第1步：过滤
  { $sort: { createdAt: -1 } },        // 第2步：排序
  { $project: { title: 1, _id: 0 } }   // 第3步：选字段
])
```

### 顺序很重要

- `$match` 尽量放前面 → 先减少数据量，后续 stage 更快
- 调换 stage 顺序可能改变结果（尤其 `$match` 和 `$group` 调换时）

### find() vs aggregate()

| | find() | aggregate() |
|--|--------|-------------|
| 复杂度 | 简单查询 | 复杂统计/变换 |
| stage 数量 | 固定（过滤+排序+投影） | 无限 chain |
| 创建新字段 | ❌ | ✅ |
| 分组统计 | ❌ | ✅ |
| 拆数组 | ❌ | ✅ |

---

## $match — 过滤

类比 WHERE，只保留符合条件的文档。

```javascript
{ $match: { status: "paid" } }
{ $match: { price: { $gt: 500 } } }
{ $match: { published: true, commentCount: { $gte: 1 } } }
```

**技巧：** 放管道最前面，越早过滤掉不要的数据越好。

---

## $sort — 排序

```javascript
{ $sort: { createdAt: -1 } }       // 按时间降序
{ $sort: { price: -1, qty: 1 } }   // 先按价格降序，再按数量升序
```

- `1` = 升序
- `-1` = 降序

---

## $project — 投影

### 选字段（和 find() 投影一样）

```javascript
{ $project: { title: 1, commentCount: 1, _id: 0 } }
```

### 创建新字段（find() 做不到）

```javascript
{ $project: {
  title: 1,
  excerptLength: { $strLenCP: "$excerpt" },   // 字符串长度
  summary: { $concat: ["《", "$title", "》"] }   // 字符串拼接
}}
```

**注意：** `$project` 只保留你指定的字段，没列出的会被剔除。不想剔除用 `$addFields`。

---

## $group — 分组统计

### 语法

```javascript
{
  $group: {
    _id: "$status",            // 按 status 分组
    count: { $sum: 1 },         // 计数
    total: { $sum: "$price" },  // 求和
    avg: { $avg: "$price" },    // 平均值
    max: { $max: "$price" },    // 最大值
    min: { $min: "$price" }     // 最小值
  }
}
```

### $sum 的两种用法

| 写法 | 含义 |
|------|------|
| `$sum: 1` | 每来一条文档 +1（计数） |
| `$sum: "$price"` | 每来一条文档 +price 字段的值（求和） |

### 其他累加器

| 累加器 | 作用 |
|--------|------|
| `$push` | 把值收集到数组 |
| `$first` | 组内第一个值 |
| `$last` | 组内最后一个值 |

### _id: null 表示不分组

把所有文档作为一个组，算全局值：

```javascript
{ $group: { _id: null, totalPrice: { $sum: "$price" }, avgPrice: { $avg: "$price" } } }
```

---

## $unwind — 数组拆行

把数组中的每个元素拆成一条独立文档。

### 拆之前

```
{ title: "MongoDB 入门", tags: [tagId1, tagId2] }
```

### 拆之后

```
{ title: "MongoDB 入门", tags: tagId1 }
{ title: "MongoDB 入门", tags: tagId2 }
```

### 典型用法：标签云统计

```javascript
db.posts.aggregate([
  { $unwind: "$tags" },              // 每个标签拆成一行
  { $group: { _id: "$tags", count: { $sum: 1 } } },  // 按标签分组计数
  { $sort: { count: -1 } }           // 按使用次数降序
])
```

---

## $addFields — 添加新字段

保留所有已有字段，只追加或覆盖你指定的字段。

```javascript
{ $addFields: {
  author: { $arrayElemAt: ["$author", 0] },    // 数组转对象
  isPopular: { $gte: ["$commentCount", 5] }     // 新增布尔字段
}}
```

**和 `$project` 的区别：**

| | $project | $addFields |
|--|----------|------------|
| 已有字段 | 只保留指定的 | 全部保留 |
| 新字段 | ✅ | ✅ |

---

## $text — 全文搜索

### 建索引

```javascript
db.posts.createIndex(
  { title: "text", content: "text" },
  { default_language: "none" }    // 逐字匹配，适合中文
)
```

### 搜索

```javascript
db.posts.aggregate([
  { $match: { $text: { $search: "MongoDB" } } },
  { $project: { title: 1, score: { $meta: "textScore" }, _id: 0 } },
  { $sort: { score: -1 } }
])
```

- `textScore` 返回匹配度评分
- 按 `textScore` 降序排列，最相关的排第一

---

## 聚合常用表达式

| 表达式 | 作用 | 示例 |
|--------|------|------|
| `$strLenCP` | 字符串长度 | `{ $strLenCP: "$title" }` |
| `$concat` | 拼接字符串 | `{ $concat: ["$a", "$b"] }` |
| `$multiply` | 乘法 | `{ $multiply: ["$price", "$qty"] }` |
| `$add` | 加法 | `{ $add: ["$a", "$b"] }` |
| `$subtract` | 减法 | `{ $subtract: ["$a", "$b"] }` |
| `$arrayElemAt` | 取数组元素 | `{ $arrayElemAt: ["$arr", 0] }` |

---

## $ 和 $$ 引用规则

| 写法 | 含义 | 场景 |
|------|------|------|
| `"$字段名"` | 引用文档中的字段值 | `$group`, `$project`, `$match` 的 `$expr` |
| `"$$变量名"` | 引用自定义变量 | `$map` 的 `in` 里用 |

```javascript
// $ 引用字段
{ $group: { _id: "$status", total: { $sum: "$price" } } }

// $$ 引用变量
{ $map: { input: "$tags", as: "t", in: "$$t.name" } }
```

---

## Stage 速查表

| Stage | 作用 | 放前面？ |
|-------|------|---------|
| `$match` | 过滤文档 | ✅ 尽量第一个 |
| `$sort` | 排序 | 数据少时放 |
| `$project` | 选/创建字段 | 需要时放 |
| `$group` | 分组统计 | 靠前 |
| `$unwind` | 数组拆行 | 在 `$group` 前 |
| `$lookup` | 关联查询 | 需要时放 |
| `$addFields` | 添加字段 | 需要时放 |

## 常见组合套路

```
1. 过滤 → 关联 → 拆数组 → 分组 → 排序 → 投影
   $match → $lookup → $unwind → $group → $sort → $project

2. 拆数组 → 分组 → 关联 → 排序
   $unwind → $group → $lookup → $sort

3. 过滤 → 关联 → 投影
   $match → $lookup → $addFields → $project
```
