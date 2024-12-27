const { v4: uuidv4 } = require('uuid');
const mongoose = require("mongoose");
const Schema = mongoose.Schema

const orderSchema  = new Schema({
    userId :{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    orderId : {
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    orderedItems:[{

        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        size:{
            type:String,
            required:true
        }

    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    paymentMethod:{
        type:String,
        enum: ['COD', 'PayPal', 'Razorpay','Wallet'], // Make sure Razorpay is listed here
        required: true,
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        name: { type: String, required: true },
        streetAddress: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        phone: { type: String, required: true },
        altPhone: { type: String }
    },
    invoiceDate:{
        type:Date
    },
    status: {
        type: String,
        enum: ['Placed', 'Pending Payment', 'Completed', 'Cancelled','Delivered','Returned','Rejected'], // Include all possible statuses
        default: 'Placed',
      },
    createdOn :{
        type:Date,
        default:() => new Date().toISOString().split('T')[0],
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    couponOffer:{
        type:Number,
        default:0
    },
    returnRequest: {
        status: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected',],
          default: null
        },
        reason: String,
        comment: String,
        createdAt: Date
      }
})

module.exports = mongoose.model("Order",orderSchema)