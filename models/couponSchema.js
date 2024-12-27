const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const couponSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  createOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiresOn: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  offerPrice: {
    type: Number,
    required: true,
  },
  minimumPrice: {
    type: Number,
    required: true,
  },
  isList: {
    type: Boolean,
    default: true,
  },
  users: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      usageCount: {
        type: Number,
        default: 0,
      },
    },
  ],
});

module.exports = mongoose.model("Coupon", couponSchema);
