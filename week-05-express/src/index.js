import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb, closeDb } from "./db.js";
import tagsRouter from "./routes/tags.js";
import categoriesRouter from "./routes/categories.js";
import usersRouter from "./routes/users.js";
import postsRouter from "./routes/posts.js";
import commentsRouter from "./routes/comments.js";
import statsRouter from "./routes/stats.js";
import { PORT } from "./config.js";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.use("/tags", tagsRouter);
app.use("/categories", categoriesRouter);
app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/comments", commentsRouter);
app.use("/stats", statsRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "../../week-07-frontend")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ detail: "Internal server error" });
});

async function start() {
  await connectDb();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});

start().catch(console.error);
