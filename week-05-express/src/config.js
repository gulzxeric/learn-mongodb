import "dotenv/config";

export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
export const DATABASE_NAME = process.env.DATABASE_NAME || "blog";
export const PORT = parseInt(process.env.PORT || "3000");
