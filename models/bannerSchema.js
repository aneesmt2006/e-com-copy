const mongoose = require("mongoose")
const couponSchema = require("./couponSchema")
const Schema = mongoose.Schema


const bannerSchema = new Schema({
    image:{
        type:string,
        required:true
    },
    title:{
        type:string,
        required:true,
    },
    description:{
        type:string,
        required:true
    },
    link:{
        type:string,
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    }
})

module.exports = mongoose.model("Coupon",couponSchema)