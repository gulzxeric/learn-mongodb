# 第 3 周：聚合管道 + 高级查询

## 目录

| 文件 | 内容 |
|------|------|
| `00-seed-data.mongodb.js` | 种子数据（先跑这个） |
| `01-intro-and-match.mongodb.js` | 聚合管道入门：`$match` / `$sort` / `$project` |
| `02-group-and-accumulators.mongodb.js` | 分组统计：`$group` + `$sum` / `$avg` / `$max` / `$min` |
| `03-unwind.mongodb.js` | 数组展开：`$unwind`（标签云统计） |
| `04-practical-stats.mongodb.js` | 博客实战统计（作者排行、分类统计、评论排行等） |
| `05-text-search.mongodb.js` | 全文搜索：`$text` 索引 |

## 执行顺序

```
1. 00-seed-data.mongodb.js    ← 先插入更多数据
2. 01-intro-and-match.mongodb.js
3. 02-group-and-accumulators.mongodb.js
4. 03-unwind.mongodb.js
5. 04-practical-stats.mongodb.js
6. 05-text-search.mongodb.js
```

## 聚合管道速查

| Stage | 作用 | 类比 |
|-------|------|------|
| `$match` | 过滤文档 | WHERE |
| `$sort` | 排序 | ORDER BY |
| `$project` | 选/创建字段 | SELECT |
| `$group` | 分组统计 | GROUP BY |
| `$unwind` | 数组拆成多行 | — |
| `$lookup` | 关联查询 | JOIN |
| `$addFields` | 添加新字段 | — |

## 累加器

| 累加器 | 作用 |
|--------|------|
| `$sum` | 求和/计数 |
| `$avg` | 平均值 |
| `$max` / `$min` | 最大值 / 最小值 |
| `$push` | 把值收集到数组 |
| `$first` / `$last` | 分组内第一个/最后一个值 |
