import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();
  const { post_id, page = 1, page_size = 10 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));

  const query = {};
  if (post_id) {
    if (!ObjectId.isValid(post_id)) return res.status(400).json({ detail: "Invalid post ID" });
    query.postId = new ObjectId(post_id);
  }

  const total = await db.collection("comments").countDocuments(query);
  const comments = await db.collection("comments").find(query)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const items = comments.map(c => ({
    id: c._id.toString(),
    postId: c.postId.toString(),
    authorId: c.authorId.toString(),
    body: c.body,
    createdAt: c.createdAt,
  }));

  res.json({ items, total, page: pageNum, page_size: pageSize });
});

router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid comment ID" });
  const db = getDb();
  const comment = await db.collection("comments").findOne({ _id: new ObjectId(req.params.id) });
  if (!comment) return res.status(404).json({ detail: "Comment not found" });
  res.json({
    id: comment._id.toString(),
    postId: comment.postId.toString(),
    authorId: comment.authorId.toString(),
    body: comment.body,
    createdAt: comment.createdAt,
  });
});

router.post("/", async (req, res) => {
  const db = getDb();
  const body = req.body;

  if (!ObjectId.isValid(body.postId)) return res.status(400).json({ detail: "Invalid post ID" });
  if (!ObjectId.isValid(body.authorId)) return res.status(400).json({ detail: "Invalid author ID" });
  if (!await db.collection("posts").findOne({ _id: new ObjectId(body.postId) })) {
    return res.status(400).json({ detail: "Post not found" });
  }
  if (!await db.collection("users").findOne({ _id: new ObjectId(body.authorId) })) {
    return res.status(400).json({ detail: "User not found" });
  }

  const doc = {
    postId: new ObjectId(body.postId),
    authorId: new ObjectId(body.authorId),
    body: body.body,
    createdAt: new Date(),
  };

  const result = await db.collection("comments").insertOne(doc);

  await db.collection("posts").updateOne(
    { _id: new ObjectId(body.postId) },
    { $inc: { commentCount: 1 } }
  );

  const comment = await db.collection("comments").findOne({ _id: result.insertedId });
  res.status(201).json({
    id: comment._id.toString(),
    postId: comment.postId.toString(),
    authorId: comment.authorId.toString(),
    body: comment.body,
    createdAt: comment.createdAt,
  });
});

router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid comment ID" });
  const db = getDb();
  const comment = await db.collection("comments").findOne({ _id: new ObjectId(req.params.id) });
  if (!comment) return res.status(404).json({ detail: "Comment not found" });

  await db.collection("posts").updateOne(
    { _id: comment.postId },
    { $inc: { commentCount: -1 } }
  );
  await db.collection("comments").deleteOne({ _id: new ObjectId(req.params.id) });
  res.status(204).send();
});

export default router;
