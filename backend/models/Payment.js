// models/Payment.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    application: {
      type: Schema.Types.ObjectId,
      ref: "LoanApplication",
      required: true,
    },
    borrower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emisPaid: { type: Number, required: true },
    amount: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
