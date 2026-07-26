import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const { MONGO_URI } = process.env;
if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment. Please add it to backend/.env.");
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const indexes = await db.collection("users").indexes();
    const phoneIndex = indexes.find((index) => index.name === "phone_1");

    if (!phoneIndex) {
      console.log("No stale users.phone_1 index found.");
    } else {
      await db.collection("users").dropIndex("phone_1");
      console.log("Dropped stale users.phone_1 index.");
    }
  } catch (error) {
    console.error("Failed to remove stale index:", error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
