const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Coupon  = require('../../models/couponSchema')
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const storage = require("../../helpers/multer");
const sharp = require("sharp");
const uploads = multer({ storage });


const getCouponPage  = async(req,res)=>{
    console.log("get coupon page ")
    try {
        const couponData = await Coupon.find()
        res.render('coupon',{
            couponData,
        })
    } catch (error) {
        
    }
}

const addCoupon  = async(req,res)=>{
    console.log("from adding coupon ")
    try {
        const { couponName, startDate, endDate, offerPrice, minimumPrice, userId } = req.body;
        console.log(req.body)
        console.log(couponName, startDate, endDate, offerPrice, minimumPrice,)

        // Validate required fields
        console.log(1)
        if (!couponName || !startDate || !offerPrice || !minimumPrice) {
            return res.status(400).json({ message: "All fields are required" });
        }

        console.log(2)
        // Check for duplicate coupon
        const existingCoupon = await Coupon.findOne({ couponName });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon with this name already exists" });
        }

        console.log(3)
        // Create new coupon
        const newCoupon = new Coupon({
            name:couponName,
            createOn: startDate || Date.now(),
            expiresOn:endDate,
            offerPrice,
            minimumPrice,
            // userId,
        });

        console.log(4)
        await newCoupon.save();
        res.status(200).json({ success:'true' , coupon: newCoupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
}


// get data for edit coupon 

const getCouponData  =  async(req,res)=>{
    console.log("from get data for edit coupon")
    const {couponId}  = req.params
    console.log('coupon Id:',couponId)
    try {
        const couponData = await Coupon.findOne({_id:couponId})
        res.status(200).json({success:true,couponData:couponData})
    } catch (error) {
        console.error(error)
    }
}

// edit coupon 

const editCoupon = async(req,res)=>{
    const {couponId} = req.params
    const updatedFields = {
        name: req.body.couponName,
        createOn: req.body.startDate, // Assuming "startDate" is the equivalent of "createOn"
        expiresOn: req.body.endDate, // Assuming "endDate" is the equivalent of "expiresOn"
        offerPrice: parseFloat(req.body.offerPrice), // Convert to number
        minimumPrice: parseFloat(req.body.minimumPrice), // Convert to number
    };

    console.log("id for edit",couponId)
    try {
      // Update the coupon in the database
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        updatedFields,
        { new: true } // Return the updated document
    );

       
        if (updatedCoupon) {
            res.json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
        } else {
            res.status(404).json({ success: false, message: 'Coupon not found' });
        }
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

// delete Coupon 
const deleteCoupon = async (req, res) => {
    const { couponId } = req.params;

    try {
        // Find and delete the coupon by its ID
        const deletedCoupon = await Coupon.deleteOne({_id:couponId});
        console.log("deleted coupon ",deleteCoupon)

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, error: 'Coupon not found' });
        }

        res.json({ success: true, message: 'Coupon deleted successfully!' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ success: false, error: 'Failed to delete coupon' });
    }
};
module.exports = {
    getCouponPage,
    addCoupon ,
    getCouponData,
    editCoupon,
    deleteCoupon
}