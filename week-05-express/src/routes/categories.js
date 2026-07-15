import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();
  const cats = await db.collection("categories").find().sort({ name: 1 }).toArray();
  res.json(cats.map(c => ({ id: c._id.toString(), name: c.name, slug: c.slug })));
});

router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid category ID" });
  const db = getDb();
  const cat = await db.collection("categories").findOne({ _id: new ObjectId(req.params.id) });
  if (!cat) return res.status(404).json({ detail: "Category not found" });
  res.json({ id: cat._id.toString(), name: cat.name, slug: cat.slug });
});

router.post("/", async (req, res) => {
  const db = getDb();
  const result = await db.collection("categories").insertOne({ name: req.body.name, slug: req.body.slug });
  const cat = await db.collection("categories").findOne({ _id: result.insertedId });
  res.status(201).json({ id: cat._id.toString(), name: cat.name, slug: cat.slug });
});

router.put("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid category ID" });
  const db = getDb();
  const result = await db.collection("categories").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { name: req.body.name, slug: req.body.slug } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Category not found" });
  const cat = await db.collection("categories").findOne({ _id: new ObjectId(req.params.id) });
  res.json({ id: cat._id.toString(), name: cat.name, slug: cat.slug });
});

router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid category ID" });
  const db = getDb();
  const result = await db.collection("categories").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Category not found" });
  res.status(204).send();
});

export default router;
