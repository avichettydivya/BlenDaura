import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Atlas connected successfully");
  process.exit(0);
} catch (err) {
  console.error("❌ MongoDB Atlas connection failed:");
  console.error(err.message);
  process.exit(1);
}
