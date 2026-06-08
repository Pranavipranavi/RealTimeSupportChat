import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error("Usage: npm run create-admin -- \"Admin Name\" admin@example.com strongpassword");
  process.exit(1);
}

await connectDB();

const existing = await User.findOne({ email });
if (existing) {
  existing.name = name;
  existing.role = "admin";
  if (password) existing.password = password;
  await existing.save();
  console.log(`Updated admin: ${email}`);
} else {
  await User.create({ name, email, password, role: "admin" });
  console.log(`Created admin: ${email}`);
}

await mongoose.disconnect();
