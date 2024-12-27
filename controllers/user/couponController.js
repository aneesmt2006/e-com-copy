const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Coupon = require('../../models/couponSchema')


const applyCoupon = async (req, res) => {

    const {checkoutTotal} = req.query
    console.log(checkoutTotal)
    console.log("from apply coupon-------checkout total-----",checkoutTotal)
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        console.log(couponCode)
        console.log(1)
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });
        if (!coupon) {
            console.log(2)
            return res.json({ success: false, message: "Invalid coupon code." });
        }
        console.log(3)
        if (coupon.expiresOn < new Date()) {
            console.log(4)
            return res.json({ success: false, message: "Coupon has expired." });
        }

        const userUsage = coupon.users.find((user) => user.userId.toString() === userId);
        if (userUsage && userUsage.usageCount >= 5) {
            return res.json({ success: false, message: "Coupon usage limit reached." });
        }

        console.log(5)
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        // const totalCartPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalCartPrice = checkoutTotal

        if (totalCartPrice < coupon.minimumPrice) {
            return res.json({ success: false, message: "Minimum purchase amount not met." });
        }

        const discount =  coupon.offerPrice
        const finalTotal = totalCartPrice - coupon.offerPrice;

        // Update coupon usage
        if (!userUsage) {
            coupon.users.push({ userId, usageCount: 1 });
        } else {
            userUsage.usageCount += 1;
        }
        await coupon.save();

        //session storing 
        req.session.couponData = { couponCode, discount, finalTotal };
        console.log("from apply coupon---aftter data--->",req.session.couponData)

        res.json({ success: true, discount, finalTotal });
    } catch (error) {
        console.error("Error applying coupon:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


const removeCoupon = async (req, res) => {
    try {
      // Fetch the discount data from session
      const couponData = req.session.couponData;

      console.log('>> from removing copon <<<',couponData)
  
      if (!couponData) {
        return res.status(400).json({ success: false, message: "No coupon applied." });
      }
  
      const discountAmount = couponData.discount; // Discount applied from the coupon
      const originalTotal = couponData.finalTotal || 0;
  
      // Adjust the total price
      const updatedTotal = originalTotal + discountAmount;

      console.log('updated data >',updatedTotal)
  
      // Clear the session data related to the coupon
      req.session.couponData.discount = 0;
      req.session.couponData.finalTotal = updatedTotal;
  
      res.json({
        success: true,
        message: "Coupon removed successfully.",
        discountAmount: discountAmount,
        newTotal: updatedTotal,
        finalTotal:updatedTotal,
      });
    } catch (error) {
      console.error("Error removing coupon:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  };
  

  

module.exports ={
     applyCoupon,
     removeCoupon
}