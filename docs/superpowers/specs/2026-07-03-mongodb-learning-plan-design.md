# MongoDB 学习计划设计文档

## 背景

用户有 SQL 关系型数据库基础，目标是通过工作和实战掌握 MongoDB，使用 JS/TypeScript 和 Python 作为主要驱动语言。学习周期 3-4 周。

## 学习方案

项目驱动法——用一个博客 CMS 系统贯穿全部学习内容，在构建项目的过程中学习 MongoDB。

## 项目概览

博客 CMS API，包含以下实体：

- **User** - 作者/读者
- **Post** - 博客文章
- **Comment** - 评论
- **Tag** - 标签
- **Category** - 分类

每个实体对应 MongoDB 的一个集合，Post 文档中内嵌评论数量、引用标签 ID，演示文档建模的嵌入与引用决策。

## 技术栈

| 层 | 技术 |
|---|------|
| 数据库 | MongoDB Atlas（云部署） |
| 交互方式 | mongosh + VSCode MongoDB 插件 |
| Node.js 驱动 | mongodb 原生驱动 |
| Python 驱动 | pymongo |
| API 框架 | Express (Node.js) |
| GUI 工具 | VSCode MongoDB 插件（替代 Compass） |

## 学习路径（4 周）

### 第 1 周：基础 + CRUD

- 安装 MongoDB，启动本地实例，熟悉 mongosh
- SQL 数据库结构 → MongoDB 文档结构映射
- 概念对照：集合 vs 表、文档 vs 行、\_id vs PRIMARY KEY
- 基础 CRUD：insertOne / find / updateOne / deleteOne / findOne
- 用 mongosh 操作：创建用户、发布文章、查询/更新/删除
- 引入 Node.js (mongoose) 驱动连接数据库
- **项目产出**：能在 mongosh 和 Node.js 中完成博客的基本增删改查

### 第 2 周：文档建模 + 关系处理

- 评论的设计：嵌入 vs 引用的决策树
- 多对多关系（文章 ↔ 标签）：引用数组模式
- 一对多关系（用户 ↔ 文章、分类 ↔ 文章）
- 索引：单字段索引、复合索引、TTL 索引
- SQL JOIN → MongoDB $lookup
- Python (pymongo) 驱动接入
- **项目产出**：博客数据模型确定，3 种驱动（shell + mongoose + pymongo）全部打通

### 第 3 周：聚合管道 + 高级查询

- 聚合管道：$match / $group / $sort / $project / $unwind / $lookup
- SQL 类比：GROUP BY → $group, HAVING → $match 后 $group, ORDER BY → $sort
- 实战统计：每篇文章评论数、标签云、作者发文排行
- 全文搜索：$text 索引 + $meta
- **项目产出**：能通过聚合管道完成复杂统计查询

### 第 4 周：实战整合 + 部署

- 用 Express 或 FastAPI 封装 RESTful API
- 数据验证、错误处理、分页
- MongoDB Atlas 云部署
- 导入批量测试数据
- **最终产出**：一个可运行的博客 CMS API（含 API 文档或 README）+ 样例数据脚本

## 每节课结构

每节课按以下流程展开：

1. **SQL 回顾** — 在 SQL 中怎么做这件事
2. **MongoDB 对比** — MongoDB 的等价做法和设计哲学
3. **博客实战** — 在项目中应用
4. **练习** — 2-3 个独立练习
5. **小结** — 关键点、常见坑

## 验收标准

- 能用 mongosh 和两种编程语言驱动完整操作 MongoDB
- 理解文档建模中嵌入 vs 引用的决策原则
- 能写出基本到中等的聚合管道
- 理解索引的原理和适用场景
- 能在 MongoDB Atlas 上部署数据库
