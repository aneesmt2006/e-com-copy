const mongoose = require("mongoose");

const Schema = mongoose.Schema

const CartSchema = Schema({
    userId :{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        size: { // Specific size selected by the user
            type: String,
            // e.g., "S", "M", "L", etc.
        },
        quantity: {
            type: Number,
            default: 1,
            max:5
        },
        price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            default:0,
            required:true
        
        },
        status:{
            type :String,
            default:'placed'
        },
        cancellationReason:{
            type:String,
            default:"none"
        },
        

    }]

})

module.exports  = mongoose.model("Cart",CartSchema)

