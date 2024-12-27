const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const mongoose = require('mongoose');





const getWishlist = async (req, res) => {
    try {
      const userId = req.session.user;
    const userdata = await User.findById(userId);
    let wishlistData = await Wishlist.find({userId}).populate("products.productId");

    // If no wishlist exists, create an empty one
    if (wishlistData.length === 0) {
      wishlistData = [{ products: [] }];
    }

    console.log('wishlist=======', wishlistData);
    res.render("wishlist", {
      user: userdata,
      wishlistData,
    })
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).send("Server Error");
    }
  };
  







const addToWishlist = async (req, res) => {
    const { productId } = req.body; // Product ID from the frontend
    const userId = req.session.user; // Assuming user ID is available in `req.session.user`

    if (!userId) {
        return res.status(401).json({ message: 'User not logged in' });
    }

    console.log("wishlist product id --------->", productId);

    try {
        // Find the wishlist for the user
        let wishlist = await Wishlist.findOne({ userId });

        // If no wishlist exists, create a new one with an empty products array
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        // Ensure `products` is always an array
        if (!Array.isArray(wishlist.products)) {
            wishlist.products = [];
        }

        // Check if the product already exists in the wishlist
        const productExists = wishlist.products.some((item) => 
            item.productId.toString() === productId
        );

        if (productExists) {
            return res.status(400).json({ message: 'Product is already in your wishlist' });
        }

        // Add the product to the wishlist
        wishlist.products.push({ productId });
        console.log('wishlist data ',wishlist)
        await wishlist.save();

        res.status(200).json({ message: 'Product added to wishlist', wishlist });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// const mongoose = require("mongoose");

const removeWishlist = async (req, res) => {
  try {
    const userId = req.session.user; // Ensure this contains the logged-in user ID
    const { productId } = req.params;


    // Convert productId to ObjectId
    // const objectIdProductId = new mongoose.Types.ObjectId(productId);

    console.log("User ID:", userId);
    console.log("Product ID to remove:", productId);

    // Find the wishlist before update for debugging
    const originalWishlist = await Wishlist.findOne({ userId });
    console.log("Original wishlist--", originalWishlist);

    // Perform the removal
    const updatedWishlist = await Wishlist.findOneAndUpdate(
        { userId: userId }, // Find the wishlist by userId
        { $pull: { products: { productId: productId } } }, // Remove the product with the specified productId
        { new: true } // Return the updated document
    );

    // Debugging: Find the wishlist after update
    const postUpdateWishlist = await Wishlist.findOne({ userId });
    console.log("Updated wishlist---------->>", postUpdateWishlist);

    // Check if the product was removed
    if (
      postUpdateWishlist &&
      !postUpdateWishlist.products.some(
        (product) => product.productId.toString() === productId.toString()
      )
    ) {
      return res.json({ success: true, message: "Product removed from wishlist" });
    }

    res.status(400).json({ success: false, message: "Product removal failed" });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

  

  

module.exports  = {
     addToWishlist,
     getWishlist,
     removeWishlist,
}