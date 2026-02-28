// reset-db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/User.js";
import LoanApplication from "./models/LoanApplication.js";

dotenv.config();

async function resetDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    // OPTION A: Drop entire database (comment out if you don't want this)
    // --------------------------------
    // This will remove ALL collections in the connected DB
    // await mongoose.connection.dropDatabase();
    // console.log("✅ Database dropped completely");

    // OPTION B: Only clear specific collections
    // --------------------------------
    await User.deleteMany({});
    await LoanApplication.deleteMany({});
    console.log("✅ Cleared collections: users & loanapplications");

    await mongoose.disconnect();
    console.log("✅ Disconnected. Reset complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error while resetting DB:", err);
    process.exit(1);
  }
}

resetDatabase();
