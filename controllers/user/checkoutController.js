const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require('../../models/addressSchema')
const Coupon  = require('../../models/couponSchema')
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const { userAuth } = require("../../middlewares/auth");


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect('/login');
    }

    const { data } = req.query;
    // const Bufferdata = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
    var cartdata = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" } // Populate category inside product
    }); 
    const decodedData = cartdata.items.reduce((sum, item) => sum + item.totalPrice, 0);



    console.log("Total Cart Price from checkout------:", decodedData);
    console.log("decoded Data ............",decodedData)


    // Ensure session contains default coupon data if not applied yet
    console.log('---------------------------------------------',req.session.couponData)
    req.session.couponData = req.session.couponData || { discount: 0, finalTotal: decodedData.total };

    const userdata = await User.findOne({ _id: userId });
    const addressData = await Address.findOne({ userId });
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" } // Populate category inside product
    });
    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    const cartItemsWithOffers = cart.items.map((item) => {
      const product = item.productId;
      const category = product.category;
      const maxOffer = Math.max(product.productOffer || 0, category.categoryOffer || 0);
      const salePrice = product.regularPrice - (product.regularPrice * maxOffer / 100);
      const totalPrice = salePrice * item.quantity;
      const itemDiscount = (product.regularPrice - salePrice) * item.quantity;
      return {
        ...item.toObject(),
        salePrice,
        totalPrice,
        itemDiscount,
      };
    });

    const totalPriceAfterOffers = cartItemsWithOffers.reduce((sum, item) => sum + item.totalPrice, 0);

    const totalDiscount = cartItemsWithOffers.reduce((sum, item) => sum + parseFloat(item.itemDiscount), 0);
    console.log('---discont',totalDiscount)



    const razorpayKey = process.env.RAZORPAY_KEY_ID;
    const coupons = await Coupon.find()


    console.log('sessionff',req.session.couponData)
    // console.log("cart items with offers <<<<<<<<<<<>>>>>>>>>>>>> ",cartItemsWithOffers)
    // Pass data to render, including couponData from session
    res.render('checkout', {
      user: userdata,
      addresses: addressData?.address || [],
      coupons:coupons,
      items: cartItemsWithOffers,
      total: (req.session.couponData.finalTotal || decodedData).toFixed(2),
      totalDiscount:totalDiscount.toFixed(2),
      razorpayKey,
      couponData: req.session.couponData, // Keeps coupon state across reloads
    });
  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.status(500).send("Internal Server Error");
  }
};


  
  
  


module.exports = { 
    getCheckoutPage,
}