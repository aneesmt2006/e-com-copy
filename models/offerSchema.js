const mongoose  = require('mongoose')
const Schema = mongoose.Schema;


const offerSchema = new Schema({
    type: {
        type: String,
        enum: ["Product", "Category", "Referral"],
        required: true,
      },
      productId: { 
        type: Schema.Types.ObjectId, 
        ref: "Product" 
      }, // For product offers
      categoryId: { 
        type: Schema.Types.ObjectId, 
        ref: "Category" 
      }, // For category offers
      discountValue: {
        type: Number, // Percentage value or flat amount
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    
})

module.exports = mongoose.model("offer",offerSchema)