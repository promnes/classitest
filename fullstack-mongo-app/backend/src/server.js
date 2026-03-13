import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import { connectDb } from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const port = process.env.PORT || 5001;

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  await connectDb();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
