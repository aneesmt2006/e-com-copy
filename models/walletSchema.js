const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  balance: { type: Number, required: true, default: 0 },
  transactions: [
    {
      amount: { type: Number, required: true },
      type: { type: String, enum: ["credit", "debit"], required: true }, // Type of transaction // E.g., "Order Refund", "Order Payment"
      createdAt: { type: Date, default: Date.now },
    },
  ],
});
module.exports = mongoose.model("Wallet",walletSchema)
//   canceledBalance: { type: Number, required: true, default: 0 },
//    // For Wallatet
