import { getDB } from "../db.js";

export async function verifyAdmin(req, res, next) {
  const db = getDB();
  const user = await db.collection("users").findOne({ email: req.user.email });
  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
}

export async function verifyVolunteerOrAdmin(req, res, next) {
  const db = getDB();
  const user = await db.collection("users").findOne({ email: req.user.email });
  if (!["admin", "volunteer"].includes(user?.role)) {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
}

export async function verifyActiveUser(req, res, next) {
  const db = getDB();
  const user = await db.collection("users").findOne({ email: req.user.email });
  if (user?.status !== "active") {
    return res.status(403).send({ message: "Blocked user" });
  }
  next();
}
