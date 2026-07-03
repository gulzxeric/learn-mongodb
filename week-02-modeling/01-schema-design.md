# 第 2 周：文档建模

## 嵌入 vs 引用

MongoDB 有两种方式处理数据关系。

### 嵌入（Embedded）

数据直接写在父文档里：

```javascript
{
  title: "MongoDB 入门",
  comments: [
    { body: "好文章", author: "alice" },
    { body: "学习了", author: "bob" }
  ]
}
```

适合：子数据量小、总是和父数据一起查

### 引用（Referenced）

数据分开存放，用 ID 关联：

```javascript
// posts
{ _id: ObjectId("..."), title: "MongoDB 入门" }

// comments
{ postId: ObjectId("..."), body: "好文章", author: "alice" }
```

适合：子数据量大、需要独立查询和分页

## 博客数据模型（采用引用）

```
users:      { _id, username, email }
categories: { _id, name, slug }
tags:       { _id, name }
posts:      { _id, title, content, authorId, categoryId, tags: [tagId], commentCount, createdAt }
comments:   { _id, postId, authorId, body, createdAt }
```
