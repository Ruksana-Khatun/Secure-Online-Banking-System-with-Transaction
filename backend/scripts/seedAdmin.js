import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULLNAME || "Admin";

console.log("Environment variables:", { email: !!email, password: !!password, fullName });

if (!process.env.MONGO_URI) {
  console.error("Missing MONGO_URI in backend/.env");
  process.exit(1);
}

if (!email || !password) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in backend/.env");
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "ADMIN";
    existing.status = "ACTIVE";
    if (!existing.fullName) existing.fullName = fullName;
    await existing.save();
    console.log(`Updated existing user to ADMIN: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      fullName,
      email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    });
    console.log(`Created ADMIN user: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

