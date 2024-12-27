const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Order = require('../../models/orderSchema')
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");


// user profile
const getProfile = async (req, res) => {
  const userId = req.session.user;
  const userdata = User.findOne({ _id: userId, isBlocked: false });

  try {
    if (userId) {
      res.render("profile", {
        user: userdata,
      });
    }
  } catch (error) {
    console.error("error from user profile", error);
  }
};








// Get Account Details
const getAccount = async (req, res) => {
  const userId = req.session.user; //  session contains user ID
  if (!userId) {
    return res.redirect('/login'); // Redirect to login if user not logged in
  }

  try {
    
    let user = null
    if (req.user && !req.user.isBlocked) {
      user = req.user;
    } else if (req.session.user && !req.session.user.isBlocked) {
      user = req.session.user;
    }

    if (!user) {
      return res.status(404).send("User not found or account is blocked");
    }
    const userdata = await User.findById(userId)
    // Render the user details page with the fetched data
    res.render('user-details', {
      user: userdata,
    });
  } catch (error) {
    console.error("Error fetching account details:", error);
    res.status(500).send("Internal Server Error");
  }
};



// edit user Account details 
const updateUserDetails = async (req, res) => {
    const userId = req.session.user;
    const { name, email, phone, currentPassword, newPassword } = req.body;
  
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
  
    try {
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Verify current password if new password is provided
      if (newPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
  
        if (!isMatch) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }
  
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
      }
  
      // Update user details
      user.name = name;
      user.email = email;
      user.phone = phone;
  
      // Save updated user
      await user.save();
  
      return res.status(200).json({ success: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating user details:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
  

// orders page

const getOrders = async (req, res) => {
  const userId = req.session.user;
  const userdata = await User.findOne({ _id: userId, isBlocked: false });
  console.log("userdata ------------------------>",userdata)
  try {
    const userId = req.session.user; // Assuming userId is stored in session
    const orders = await Order.find({ userId }).populate('orderedItems.product');
    res.render('orders', {
      user: userdata,
       orders,
       });
  } catch (error) {

  }
};

module.exports = {
  getProfile,
  getAccount,
  updateUserDetails,
  getOrders,
};
