// clear-loans.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import LoanApplication from "./models/LoanApplication.js";

dotenv.config();

async function clearLoans() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    const result = await LoanApplication.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} loan applications`);

    await mongoose.disconnect();
    console.log("✅ Disconnected. Done.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error while clearing loan applications:", err);
    process.exit(1);
  }
}

clearLoans();
