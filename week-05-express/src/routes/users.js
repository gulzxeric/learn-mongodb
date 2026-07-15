import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();
  const users = await db.collection("users").find().sort({ username: 1 }).toArray();
  res.json(users.map(u => ({ id: u._id.toString(), username: u.username, email: u.email, createdAt: u.createdAt })));
});

router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid user ID" });
  const db = getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(req.params.id) });
  if (!user) return res.status(404).json({ detail: "User not found" });
  res.json({ id: user._id.toString(), username: user.username, email: user.email, createdAt: user.createdAt });
});

router.post("/", async (req, res) => {
  const db = getDb();
  const doc = { username: req.body.username, email: req.body.email, createdAt: new Date() };
  const result = await db.collection("users").insertOne(doc);
  const user = await db.collection("users").findOne({ _id: result.insertedId });
  res.status(201).json({ id: user._id.toString(), username: user.username, email: user.email, createdAt: user.createdAt });
});

router.put("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid user ID" });
  const update = {};
  if (req.body.username !== undefined) update.username = req.body.username;
  if (req.body.email !== undefined) update.email = req.body.email;
  if (Object.keys(update).length === 0) return res.status(400).json({ detail: "No fields to update" });

  const db = getDb();
  const result = await db.collection("users").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: update }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "User not found" });
  const user = await db.collection("users").findOne({ _id: new ObjectId(req.params.id) });
  res.json({ id: user._id.toString(), username: user.username, email: user.email, createdAt: user.createdAt });
});

router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid user ID" });
  const db = getDb();
  const result = await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "User not found" });
  res.status(204).send();
});

export default router;
