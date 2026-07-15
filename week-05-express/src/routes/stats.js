import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

router.get("/tag-cloud", async (req, res) => {
  const db = getDb();
  const pipeline = [
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ];
  const results = await db.collection("posts").aggregate(pipeline).toArray();
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

router.get("/author-ranking", async (req, res) => {
  const db = getDb();
  const pipeline = [
    { $group: { _id: "$authorId", post_count: { $sum: 1 } } },
    { $sort: { post_count: -1 } },
  ];
  const results = await db.collection("posts").aggregate(pipeline).toArray();
  const userIds = results.map(r => r._id);
  const users = {};
  for (const u of await db.collection("users").find({ _id: { $in: userIds } }).toArray()) {
    users[u._id.toString()] = u.username;
  }
  res.json(results.map(r => ({
    author_id: r._id.toString(),
    username: users[r._id.toString()] || "unknown",
    post_count: r.post_count,
  })));
});

router.get("/category-summary", async (req, res) => {
  const db = getDb();
  const pipeline = [
    { $group: { _id: "$categoryId", post_count: { $sum: 1 } } },
    { $sort: { post_count: -1 } },
  ];
  const results = await db.collection("posts").aggregate(pipeline).toArray();
  const catIds = results.map(r => r._id);
  const cats = {};
  for (const c of await db.collection("categories").find({ _id: { $in: catIds } }).toArray()) {
    cats[c._id.toString()] = c.name;
  }
  res.json(results.map(r => ({
    category_id: r._id.toString(),
    name: cats[r._id.toString()] || "unknown",
    post_count: r.post_count,
  })));
});

router.get("/dashboard", async (req, res) => {
  const db = getDb();
  res.json({
    total_posts: await db.collection("posts").countDocuments(),
    total_comments: await db.collection("comments").countDocuments(),
    total_users: await db.collection("users").countDocuments(),
    total_tags: await db.collection("tags").countDocuments(),
    total_categories: await db.collection("categories").countDocuments(),
  });
});

export default router;
