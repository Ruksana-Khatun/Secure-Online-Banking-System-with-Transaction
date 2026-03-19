import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/PPTDIGIKHATA";
const email = "admin@test.com";
const password = "admin123";
const fullName = "Admin User";

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

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

    // Create some test users
    const testUsers = [
      { fullName: "John Doe", email: "john@test.com", role: "USER", status: "ACTIVE" },
      { fullName: "Jane Smith", email: "jane@test.com", role: "USER", status: "SUSPENDED" },
      { fullName: "Bob Wilson", email: "bob@test.com", role: "USER", status: "ACTIVE" }
    ];

    for (const user of testUsers) {
      const existing = await User.findOne({ email: user.email });
      if (!existing) {
        const passwordHash = await bcrypt.hash("password123", 12);
        await User.create({
          ...user,
          passwordHash,
        });
        console.log(`Created test user: ${user.email}`);
      }
    }

    await mongoose.disconnect();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
