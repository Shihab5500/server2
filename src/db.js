import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

let client;
let db;

export async function connectDB(uri) {
  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  });
  await client.connect();
  db = client.db();
  console.log("✅ MongoDB connected");
}

export function getDB() {
  if (!db) throw new Error("DB not connected");
  return db;
}

export { ObjectId };
