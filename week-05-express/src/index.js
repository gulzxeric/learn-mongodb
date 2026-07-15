import express from "express";
import { connectDb, closeDb } from "./db.js";
import tagsRouter from "./routes/tags.js";
import categoriesRouter from "./routes/categories.js";
import usersRouter from "./routes/users.js";
import postsRouter from "./routes/posts.js";
import commentsRouter from "./routes/comments.js";
import statsRouter from "./routes/stats.js";
import { PORT } from "./config.js";

const app = express();

app.use(express.json());

app.use("/tags", tagsRouter);
app.use("/categories", categoriesRouter);
app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/comments", commentsRouter);
app.use("/stats", statsRouter);

app.get("/", (req, res) => {
  res.json({ message: "Blog CMS API", docs: "https://github.com/... (Coming Soon)" });
});

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
