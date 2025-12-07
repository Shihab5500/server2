// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import jwt from "jsonwebtoken";
// import Stripe from "stripe";
// import { connectDB, getDB, ObjectId } from "./db.js";
// import { verifyJWT } from "./middlewares/verifyJWT.js";
// import {
//   verifyAdmin,
//   verifyVolunteerOrAdmin,
//   verifyActiveUser
// } from "./middlewares/roleGuards.js";

// dotenv.config();
// const app = express();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// // Middleware
// app.use(express.json());
// app.use(
//   cors({
//     origin: [process.env.CLIENT_URL, "https://blooddonation20.netlify.app"],
//     credentials: true
//   })
// );

// // Database Connection
// await connectDB(process.env.MONGODB_URI);

// // Health Check
// app.get("/", (req, res) => res.send("Blood Donation Server Running ✅"));

// /* ---------------- AUTH / JWT ---------------- */

// app.post("/api/auth/jwt", (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).send({ message: "email required" });
//   const token = jwt.sign({ email }, process.env.JWT_SECRET, {
//     expiresIn: "7d"
//   });
//   res.send({ token });
// });

// /* ---------------- USERS ---------------- */

// // 1. Register user (Force Lowercase Email)
// app.post("/api/users", async (req, res) => {
//   const db = getDB();
//   const user = req.body;

//   if (!user?.email) {
//     return res.status(400).send({ message: "email required" });
//   }

  
//   const email = user.email.toLowerCase();

//   const filter = { email: email };

//   const updateDoc = {
//     $set: {
//       name: user.name || "Unknown",
//       email: email, // lowercase
//       avatar: user.avatar || null,
//       bloodGroup: user.bloodGroup || null,
//       district: user.district || null,
//       upazila: user.upazila || null,
//       updatedAt: new Date(),
//     },
//     $setOnInsert: {
//       role: "donor",
//       status: "active",
//       createdAt: new Date(),
//     }
//   };

//   const options = { upsert: true };

//   await db.collection("users").updateOne(filter, updateDoc, options);

//   const savedUser = await db.collection("users").findOne(filter);
//   res.send(savedUser);
// });

// // 2. Search donors
// app.get("/api/donors/search", async (req, res) => {
//   const db = getDB();
//   const { bloodGroup, district, upazila } = req.query;

//   const query = { role: "donor", status: "active" };

//   if (bloodGroup) query.bloodGroup = bloodGroup;
//   if (district) query.district = district;
//   if (upazila) query.upazila = upazila;

//   const donors = await db.collection("users")
//     .find(query)
//     .project({ password: 0 })
//     .toArray();

//   res.send(donors);
// });




import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { connectDB, getDB, ObjectId } from "./db.js";
import { verifyJWT } from "./middlewares/verifyJWT.js";
import {
  verifyAdmin,
  verifyVolunteerOrAdmin,
  verifyActiveUser
} from "./middlewares/roleGuards.js";

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(express.json());

// ✅ CORS FIX (Local + Netlify both allowed, preflight supported)
const allowedOrigins = [
  (process.env.CLIENT_URL || "").replace(/\/$/, ""), // trailing slash remove
  "https://blooddonation20.netlify.app",
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman / server-to-server
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS Not Allowed: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ✅ Preflight must for browser
app.options("*", cors());

// Database Connection
await connectDB(process.env.MONGODB_URI);

// Health Check
app.get("/", (req, res) => res.send("Blood Donation Server Running ✅"));

/* ---------------- AUTH / JWT ---------------- */

app.post("/api/auth/jwt", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ message: "email required" });
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
  res.send({ token });
});

/* ---------------- USERS ---------------- */

// 1. Register user (Force Lowercase Email)
app.post("/api/users", async (req, res) => {
  const db = getDB();
  const user = req.body;

  if (!user?.email) {
    return res.status(400).send({ message: "email required" });
  }

  const email = user.email.toLowerCase();
  const filter = { email: email };

  const updateDoc = {
    $set: {
      name: user.name || "Unknown",
      email: email, // lowercase
      avatar: user.avatar || null,
      bloodGroup: user.bloodGroup || null,
      district: user.district || null,
      upazila: user.upazila || null,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      role: "donor",
      status: "active",
      createdAt: new Date(),
    }
  };

  const options = { upsert: true };

  await db.collection("users").updateOne(filter, updateDoc, options);

  const savedUser = await db.collection("users").findOne(filter);
  res.send(savedUser);
});

// 2. Search donors
app.get("/api/donors/search", async (req, res) => {
  const db = getDB();
  const { bloodGroup, district, upazila } = req.query;

  const query = { role: "donor", status: "active" };

  if (bloodGroup) query.bloodGroup = bloodGroup;
  if (district) query.district = district;
  if (upazila) query.upazila = upazila;

  const donors = await db.collection("users")
    .find(query)
    .project({ password: 0 })
    .toArray();

  res.send(donors);
});

// 3. Get currently logged-in user (Force Lowercase Search)
app.get("/api/users/me", verifyJWT, async (req, res) => {
  const db = getDB();

  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).send({ message: "Unauthorized" });

  const me = await db.collection("users").findOne({ email });

  if (!me) {
    return res.status(404).send({ message: "User not found in DB" });
  }

  res.send(me);
});

// 4. Update logged-in user profile
app.patch("/api/users/me", verifyJWT, async (req, res) => {
  const db = getDB();
  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).send({ message: "Unauthorized" });

  const updates = req.body;
  delete updates.email;

  const result = await db.collection("users").updateOne(
    { email },
    { $set: updates }
  );
  res.send(result);
});

// 5. Get All users (Admin only)
app.get("/api/users", verifyJWT, verifyAdmin, async (req, res) => {
  const db = getDB();
  const { status, page = 1, limit = 10 } = req.query;

  const query = status ? { status } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const parsedLimit = Number(limit);

  const users = await db
    .collection("users")
    .find(query)
    .skip(skip)
    .limit(parsedLimit)
    .toArray();
  const total = await db.collection("users").countDocuments(query);

  res.send({ users, total });
});

// 6. Update user status
app.patch("/api/users/:id/status", verifyJWT, verifyAdmin, async (req, res) => {
  const db = getDB();
  const { status } = req.body;

  const result = await db.collection("users").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status } }
  );
  res.send(result);
});

// 7. Update user role
app.patch("/api/users/:id/role", verifyJWT, verifyAdmin, async (req, res) => {
  const db = getDB();
  const { role } = req.body;

  const result = await db.collection("users").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role } }
  );
  res.send(result);
});

/* ---------------- DONATION REQUESTS ---------------- */

app.post("/api/requests", verifyJWT, verifyActiveUser, async (req, res) => {
  const db = getDB();
  const body = req.body;
  const doc = {
    ...body,
    status: "pending",
    donorName: null,
    donorEmail: null,
    createdAt: new Date()
  };
  const result = await db.collection("donationRequests").insertOne(doc);
  res.send(result);
});

app.get("/api/requests/public", async (req, res) => {
  const db = getDB();
  const data = await db
    .collection("donationRequests")
    .find({ status: "pending" })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(data);
});

app.get("/api/requests", verifyJWT, async (req, res) => {
  const db = getDB();
  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).send({ message: "Unauthorized" });

  const me = await db.collection("users").findOne({ email });
  if (!me) return res.status(404).send({ message: "User not found in DB" });

  const { status, page = 1, limit = 10 } = req.query;
  const baseQuery = status ? { status } : {};

  const query =
    me.role === "donor"
      ? { ...baseQuery, requesterEmail: me.email }
      : baseQuery;

  const skip = (Number(page) - 1) * Number(limit);
  const parsedLimit = Number(limit);

  const requests = await db
    .collection("donationRequests")
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .toArray();

  const total = await db.collection("donationRequests").countDocuments(query);
  res.send({ requests, total });
});

app.get("/api/requests/:id", verifyJWT, async (req, res) => {
  const db = getDB();
  const doc = await db
    .collection("donationRequests")
    .findOne({ _id: new ObjectId(req.params.id) });
  res.send(doc);
});

app.patch("/api/requests/:id", verifyJWT, async (req, res) => {
  const db = getDB();
  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).send({ message: "Unauthorized" });

  const me = await db.collection("users").findOne({ email });
  if (!me) return res.status(404).send({ message: "User not found in DB" });

  const id = req.params.id;
  const doc = await db.collection("donationRequests").findOne({ _id: new ObjectId(id) });
  const isOwner = doc?.requesterEmail === me.email;

  if (!(isOwner || me.role === "admin"))
    return res.status(403).send({ message: "Forbidden" });

  const updates = req.body;
  delete updates.status;

  const result = await db.collection("donationRequests").updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  res.send(result);
});

app.delete("/api/requests/:id", verifyJWT, async (req, res) => {
  const db = getDB();
  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).send({ message: "Unauthorized" });

  const me = await db.collection("users").findOne({ email });
  if (!me) return res.status(404).send({ message: "User not found in DB" });

  const id = req.params.id;
  const doc = await db.collection("donationRequests").findOne({ _id: new ObjectId(id) });
  const isOwner = doc?.requesterEmail === me.email;

  if (!(isOwner || me.role === "admin"))
    return res.status(403).send({ message: "Forbidden" });

  const result = await db.collection("donationRequests").deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.patch("/api/requests/:id/confirm-donate", verifyJWT, async (req, res) => {
  const db = getDB();
  const id = req.params.id;
  const { donorName, donorEmail } = req.body;
  const result = await db.collection("donationRequests").updateOne(
    { _id: new ObjectId(id), status: "pending" },
    { $set: { status: "inprogress", donorName, donorEmail } }
  );
  res.send(result);
});

app.patch("/api/requests/:id/status", verifyJWT, async (req, res) => {
  const db = getDB();
  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).send({ message: "Unauthorized" });

  const me = await db.collection("users").findOne({ email });
  if (!me) return res.status(404).send({ message: "User not found in DB" });

  const id = req.params.id;
  const { status } = req.body;

  if (me.role === "volunteer" || me.role === "admin") {
    const result = await db.collection("donationRequests").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    return res.send(result);
  }

  const doc = await db.collection("donationRequests").findOne({ _id: new ObjectId(id) });
  if (doc?.requesterEmail !== me.email)
    return res.status(403).send({ message: "Forbidden" });

  if (doc.status !== "inprogress" || !["done", "canceled"].includes(status)) {
    return res.status(403).send({ message: "Invalid status update" });
  }

  const result = await db.collection("donationRequests").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status } }
  );
  res.send(result);
});

/* ---------------- FUNDING / STRIPE ---------------- */

app.post("/api/fundings/payment-intent", verifyJWT, async (req, res) => {
  const { amount } = req.body;
  const amountInCents = Math.round(amount * 100);
  if (amountInCents < 50) return res.status(400).send({ message: "Minimum amount is $0.50" });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    payment_method_types: ["card"]
  });
  res.send({ clientSecret: paymentIntent.client_secret });
});

app.post("/api/fundings", verifyJWT, async (req, res) => {
  const db = getDB();
  const doc = { ...req.body, date: new Date() };
  const result = await db.collection("fundings").insertOne(doc);
  res.send(result);
});

app.get("/api/fundings", verifyJWT, async (req, res) => {
  const db = getDB();
  const list = await db.collection("fundings").find().sort({ date: -1 }).toArray();
  res.send(list);
});

app.get("/api/fundings/total", verifyJWT, verifyVolunteerOrAdmin, async (req, res) => {
  const db = getDB();
  const all = await db.collection("fundings")
    .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
    .toArray();
  res.send({ total: all[0]?.total || 0 });
});

// ✅ Only listen locally, not on Vercel
if (process.env.VERCEL !== "1") {
  app.listen(process.env.PORT || 5000, () => {
    console.log("🚀 Server running on port", process.env.PORT || 5000);
  });
}

export default app;
