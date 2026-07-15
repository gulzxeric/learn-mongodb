import { MongoClient } from "mongodb";
import { MONGO_URI, DATABASE_NAME } from "./config.js";

const client = new MongoClient(MONGO_URI);

export function getDb() {
  return client.db(DATABASE_NAME);
}

export async function connectDb() {
  await client.connect();
  await client.db().admin().command({ ping: 1 });
  console.log("MongoDB connected");
}

export async function closeDb() {
  await client.close();
  console.log("MongoDB disconnected");
}
