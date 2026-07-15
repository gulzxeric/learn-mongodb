import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();
  const { page = 1, page_size = 10, author_id, category_id, tag_id, published, search } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));

  const query = {};
  if (author_id) query.authorId = new ObjectId(author_id);
  if (category_id) query.categoryId = new ObjectId(category_id);
  if (tag_id) query.tags = new ObjectId(tag_id);
  if (published !== undefined) query.published = published === "true";
  if (search) query.$text = { $search: search };

  const total = await db.collection("posts").countDocuments(query);
  const posts = await db.collection("posts").find(query)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const items = posts.map(p => ({
    id: p._id.toString(),
    title: p.title,
    content: p.content,
    excerpt: p.excerpt,
    authorId: p.authorId.toString(),
    categoryId: p.categoryId.toString(),
    tags: p.tags.map(t => t.toString()),
    commentCount: p.commentCount,
    published: p.published,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  res.json({ items, total, page: pageNum, page_size: pageSize });
});

router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid post ID" });
  const db = getDb();
  const post = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!post) return res.status(404).json({ detail: "Post not found" });
  res.json({
    id: post._id.toString(),
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    authorId: post.authorId.toString(),
    categoryId: post.categoryId.toString(),
    tags: post.tags.map(t => t.toString()),
    commentCount: post.commentCount,
    published: post.published,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  });
});

router.post("/", async (req, res) => {
  const db = getDb();
  const body = req.body;

  if (!await db.collection("users").findOne({ _id: new ObjectId(body.authorId) })) {
    return res.status(400).json({ detail: "Author not found" });
  }
  if (!await db.collection("categories").findOne({ _id: new ObjectId(body.categoryId) })) {
    return res.status(400).json({ detail: "Category not found" });
  }

  const doc = {
    title: body.title,
    content: body.content,
    excerpt: body.excerpt || "",
    authorId: new ObjectId(body.authorId),
    categoryId: new ObjectId(body.categoryId),
    tags: (body.tags || []).map(t => new ObjectId(t)),
    commentCount: 0,
    published: body.published !== undefined ? body.published : true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("posts").insertOne(doc);
  const post = await db.collection("posts").findOne({ _id: result.insertedId });
  res.status(201).json({
    id: post._id.toString(),
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    authorId: post.authorId.toString(),
    categoryId: post.categoryId.toString(),
    tags: post.tags.map(t => t.toString()),
    commentCount: post.commentCount,
    published: post.published,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  });
});

router.put("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid post ID" });
  const db = getDb();
  const body = req.body;

  const update = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.content !== undefined) update.content = body.content;
  if (body.excerpt !== undefined) update.excerpt = body.excerpt;
  if (body.categoryId !== undefined) update.categoryId = new ObjectId(body.categoryId);
  if (body.tags !== undefined) update.tags = body.tags.map(t => new ObjectId(t));
  if (body.published !== undefined) update.published = body.published;
  if (Object.keys(update).length === 0) return res.status(400).json({ detail: "No fields to update" });
  update.updatedAt = new Date();

  const result = await db.collection("posts").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: update }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Post not found" });
  const post = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  res.json({
    id: post._id.toString(),
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    authorId: post.authorId.toString(),
    categoryId: post.categoryId.toString(),
    tags: post.tags.map(t => t.toString()),
    commentCount: post.commentCount,
    published: post.published,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  });
});

router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid post ID" });
  const db = getDb();
  const result = await db.collection("posts").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Post not found" });
  res.status(204).send();
});

export default router;
