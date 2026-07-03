# 第 1 周练习

在 mongosh 中完成以下练习，连 Atlas 切到 blog 库：

```javascript
use blog
```

## 基础

1. 列出所有用户，只显示 username 和 email（排除 \_id）
2. 插入一条新用户：用户名 `dave`，邮箱 `dave@example.com`
3. 把 dave 的邮箱改成 `dave_new@example.com`
4. 删除 dave

## 进阶

5. 插入 3 篇文章，其中 2 篇 `commentCount` 大于 5，1 篇等于 0
6. 查询 `commentCount` 大于 0 的文章
7. 按创建时间倒序排列文章，取前 2 条
