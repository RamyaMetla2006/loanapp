// models/LoanApplication.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    monthsPaid: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const loanApplicationSchema = new mongoose.Schema(
  {
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    borrowerName: { type: String, required: true },
    borrowerEmail: { type: String, required: true },

    income: { type: Number, required: true },
    employmentStatus: { type: String, required: true },
    creditScore: { type: Number, required: true },

    requestedAmount: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    purpose: { type: String },

    riskScore: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "closed"],
      default: "pending",
    },

    // Approval details
    interestRate: { type: Number }, // annual %
    monthlyEmi: { type: Number },
    principal: { type: Number },
    remainingPrincipal: { type: Number },
    remainingTenure: { type: Number },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },

    payments: [paymentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("LoanApplication", loanApplicationSchema);
