const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  address: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      streetAddress: {
        type:String,
      },
      city: {
        type:String,
        required: true,
      },

      state: {
        type:String,
        required: true,
      },
      pincode: {
        type: Number,
        required: true,
      },
      phone: {
        type:String,
        required: true,
      },
      altphone: {
        type:String,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model("address", addressSchema);
