const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String, // Change 'string' to 'String'
        required: true,
    },
    email: {
        type: String, // Change 'string' to 'String'
        required: true,
        unique: true
    },
    phone: {
        type: String, // Change 'string' to 'String'
        required: false,
        unique: false,
        sparse: true,
        default: null,
    },
    googleId: {
        type: String, // Change 'string' to 'String'
        unique: true,
        sparse:true,
    },
    password: {
        type: String, // Change 'string' to 'String'
        required: false
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],
    wallet: [{
        type: Schema.Types.ObjectId,
        ref: 'Wishlist'
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    CreatedOn: {
        type: Date,
        default: Date.now
    },
    referalCode: {
        type: String // Change 'string' to 'String'
    },
    redeemed: {
        type: Boolean
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },
        brand: {
            type: String, // Change 'string' to 'String'
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model("User", userSchema);
