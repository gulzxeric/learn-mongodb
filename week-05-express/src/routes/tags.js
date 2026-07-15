import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();
  const tags = await db.collection("tags").find().sort({ name: 1 }).toArray();
  res.json(tags.map(t => ({ id: t._id.toString(), name: t.name })));
});

router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ detail: "Invalid tag ID" });
  }
  const db = getDb();
  const tag = await db.collection("tags").findOne({ _id: new ObjectId(req.params.id) });
  if (!tag) return res.status(404).json({ detail: "Tag not found" });
  res.json({ id: tag._id.toString(), name: tag.name });
});

router.post("/", async (req, res) => {
  const db = getDb();
  const result = await db.collection("tags").insertOne({ name: req.body.name });
  const tag = await db.collection("tags").findOne({ _id: result.insertedId });
  res.status(201).json({ id: tag._id.toString(), name: tag.name });
});

router.put("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ detail: "Invalid tag ID" });
  }
  const db = getDb();
  const result = await db.collection("tags").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { name: req.body.name } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Tag not found" });
  const tag = await db.collection("tags").findOne({ _id: new ObjectId(req.params.id) });
  res.json({ id: tag._id.toString(), name: tag.name });
});

router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ detail: "Invalid tag ID" });
  }
  const db = getDb();
  const result = await db.collection("tags").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Tag not found" });
  res.status(204).send();
});

export default router;
