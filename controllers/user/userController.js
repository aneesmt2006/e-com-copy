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

const loadHomepage = async (req, res) => {
  try {
    // Fetch categories and products
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
    }).sort({createdAt:-1})
      .populate("category")
      .lean(); // Use `.lean()` for easier manipulation

    // Sort products by creation date (newest first) and limit to 7
    // productData.sort((a, b) => b.createdAt - a.createdAt);
    // productData = productData.slice(0, 7);


    // Calculate effective offers and sale price for each product
    productData = productData.map((product) => {
      const categoryOffer = product.category?.categoryOffer || 0; // Offer from category
      const productOffer = product.productOffer || 0; // Offer from product
      const effectiveOffer = Math.max(categoryOffer, productOffer); // Choose the higher offer

      console.log("Product:", product.productName);
      console.log("Category Offer:", categoryOffer);
      console.log("Product Offer:", productOffer);
      console.log("Effective Offer:", effectiveOffer);
      productData.effectiveOffer = effectiveOffer

      // Calculate sale price based on the effective offer
      const salePrice =
        effectiveOffer > 0
          ? product.regularPrice - (product.regularPrice * effectiveOffer) / 100
          : product.salePrice || product.regularPrice;

      return {
        ...product,
        salePrice: salePrice.toFixed(2), // Ensure the sale price is formatted
        effectiveOffer, // Pass the effective offer to the frontend
      };
    });

    // Fetch user details
   

    console.log('User object:', req.session.user); // Add this line for debugging
    // console.log(productData)
    return res.render("home", {
      user: req.session.user,
      products: productData,
     
    });
  } catch (error) {
    console.log("Home page Not Found", error); // Log error for debugging
    res.status(500).send("Server error"); // Handle error gracefully
  }
};







//load shop page
const loadShoppage = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 8; // Number of products per page
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || "";
  const sizes = req.query.sizes ? req.query.sizes.split(",") : [];
  let categories = req.query.categories ? req.query.categories.split(",") : [];
  categories = categories.filter((id) => mongoose.Types.ObjectId.isValid(id)); // Valid category
  const sortOption = req.query.sort || "";

  try {
    const user = req.session.user;

    const userdata = await User.findOne({_id:user})

    // Search condition
    const searchCondition = searchQuery
      ? {
          $or: [
            { productName: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};

    // Size condition
    const sizeCondition =
      sizes.length > 0
        ? {
            $or: sizes.map((size) => ({ [`sizes.${size}`]: { $gt: 0 } })),
          }
        : {};

    // Category condition
    const categoryCondition =
      categories.length > 0
        ? { category: { $in: categories } }
        : {};

    // Combine conditions
    const filterCondition = {
      ...searchCondition,
      ...sizeCondition,
      ...categoryCondition,
      isBlocked: false,
    };

    // Sorting condition
    const sortCondition = {
      ...(sortOption === "price-low-high" && { regularPrice: 1 }),
      ...(sortOption === "price-high-low" && { regularPrice: -1 }),
      ...(sortOption === "new-arrivals" && { createdAt: -1 }),
      ...(sortOption === "name-asc" && { productName: 1 }),
      ...(sortOption === "name-desc" && { productName: -1 }),
    };

    // Fetch product data with populated category
    const productData = await Product.find(filterCondition)
      .sort(sortCondition)
      .skip(skip)
      .limit(limit)
      .populate("category", "name categoryOffer");





       // Fetch user's wishlist
    let wishlistProductIds = [];
    if (user) {
      const wishlist = await Wishlist.findOne({ userId:user});
      if (wishlist) {
        wishlistProductIds = wishlist.products.map((item) =>
          item.productId.toString()
        );
      }
    }

    // Add a flag to indicate if the product is in the wishlist
    productData.forEach((product) => {
      product.isInWishlist = wishlistProductIds.includes(product._id.toString());
    });




    // Calculate effective sale price
    productData.forEach((product) => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.categoryOffer || 0;
      const effectiveOffer = Math.max(productOffer, categoryOffer);
      const discount = (product.regularPrice * effectiveOffer) / 100;

      // Update salePrice dynamically
      product.salePrice = product.regularPrice - discount;
    });

    const totalProducts = await Product.find(filterCondition).countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    const allCategories = await Category.find({}, "name _id");
    const allSizes = ["S", "M", "L", "XL", "XXL"];

    // Render shop page
    return res.render("shop", {
      user: userdata,
      products: productData,
      totalProducts: totalProducts,
      totalPages: totalPages,
      page: page,
      search: searchQuery,
      sizes: sizes,
      categories: categories,
      sortOption: sortOption,
      allCategories: allCategories,
      allSizes: allSizes,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.status(500).send("Server Error");
  }
};




// product details

const productDetails = async (req, res) => {
  try {
    console.log('in product details page rendering controller => req.session', req.session.user)
    const userId = req.session.user; // Get logged-in user's session ID
    const productId = req.query.id; // Get product ID from query

    // Find the product with its category details
    const product = await Product.findOne({
      _id: productId,
      isBlocked: false,
    }).populate("category");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Calculate effective offer
    const productOffer = product.productOffer || 0;
    const categoryOffer = product.category.categoryOffer || 0;
    const effectiveOffer = Math.max(productOffer, categoryOffer);

    // Calculate sale price after applying the offer
    const salePrice =
      effectiveOffer > 0
        ? product.regularPrice - (product.regularPrice * effectiveOffer) / 100
        : product.salePrice;

    let isInCart = false;

    // Check if user is logged in and their cart exists
    if (userId) {
      const cart = await Cart.findOne({ userId });
      console.log('cart data fetched using the user id from req.session =>', cart)

      // Check if the product exists in the cart
      if (cart) {
        isInCart = cart.items.some(
          (item) => item.productId.toString() === productId
        );
      }
    }

    const userdata = await User.findById(userId )
    console.log('user data after getting the credential from database ==>', userdata)
    const sizes = Object.keys(product.sizes).map((size) => ({
      name: size,
      quantity: product.sizes[size],
      limitedStock: product.sizes[size] < 10, // Mark limited stock
    }));


    // Fetch related products
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isBlocked: false,
    }).limit(4);

    // Render the product details page
    res.render("product-details", {
      user: userdata,
      products:product,
      effectiveOffer,
      salePrice,
      isInCart,
      sizes,
      relatedProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// ADD TO CART
const addTocart = async (req, res) => {
  console.log("from cart backend");
  const userId = req.session.user;
  const { productId, size } = req.body;

  const quantity = req.body.quantity || 1;
  console.log(productId, size);

  if (!userId) {
    return res.status(401).json({ error: "pls login first" });
  }

  try {
    let cart = await Cart.findOne({ userId: userId });

    let product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" }); //check the product is or not
    }

    if (product.sizes[size] <= 0) {
      return res.status(400).json({ message: "This is Out of Stock" });
    }

    const price = product.salePrice;
    const name = product.name;
    const totalPrice = price * quantity; // Calculate the total price

    if (!cart) {
      // create a new cart for the user
      cart = new Cart({
        userId,
        items: [{ productId, name, price, totalPrice, size }],
      });
    } else {
      //comes to else case means the user have cart then,check the (product)/size already in the cart
      console.log("chekcing the prouct is in cart");
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId && item.size === size
      );

      // check product exist or not
      if (itemIndex > -1) {
        console.log("product already in cart");

        return res.status(409).json({ message: "Product already in cart" });
      } else {
        //product not in the cart ,so add it
        cart.items.push({ productId, quantity: 1, price, totalPrice, size });
      }
    }
    await cart.save();
    res.status(200).json({ message: "Product added to the cart" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET CART PAGE
const getCartpage = async (req, res) => {
  const userId = req.session.user;
  try {
    const userdata = await User.findOne({ _id: userId, isBlocked: false });
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" }, // Populate category to access categoryOffer
    });

    let items = [];
    let totalPrice = 0;
    let totalDiscount = 0;
    let message = "Your cart is empty";

    if (cart && cart.items.length > 0) {
      items = cart.items.map((item) => {
        const product = item.productId;
        const category = product.category;

        const productOffer = product.productOffer || 0;
        const categoryOffer = category ? category.categoryOffer || 0 : 0;

        // Calculate the higher offer
        const effectiveOffer = Math.max(productOffer, categoryOffer);

        // Calculate sale price and discount
        const discount = (product.regularPrice * effectiveOffer) / 100;
        const salePrice = product.regularPrice - discount;

        // Update totalPrice and totalDiscount
        totalPrice += salePrice * item.quantity;
        totalDiscount += discount * item.quantity;

       
        return {
          ...item.toObject(),
          salePrice,
          discount: discount * item.quantity,
        };
      });

      console.log("items object outsode",items)
      message = null; // Clear the empty cart message
    }
    


    console.log("total discount---->from cart------>>>",totalPrice)

    
    // encoded data for passing to checkout
    const checkoutData = {
      total:totalPrice.toFixed(2),         // Total amount after discounts
      discount:  totalDiscount.toFixed(2), // Total discount applied
    };
     
    const encodedData = Buffer.from(JSON.stringify(checkoutData)).toString("base64");

    console.log('encodedData-----',encodedData)
    console.log('cart items --->',items)


      
    res.render("cart", {
      user: userdata,
      items,
      total: totalPrice.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      message,
      encodedData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error from cart");
  }
};


//update cart

const updateCart = async (req, res) => {
  const { itemId, quantity } = req.body;
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" }, // Populate category to access categoryOffer
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }


    
    const cartItem = cart.items[itemIndex];
    const product = cartItem.productId;
    const selectedSize = cartItem.size; // Get the size selected for the cart item

    // Check if the selected size exists in the product
    if (!product.sizes[selectedSize]) {
      return res.status(400).json({ error: `Size ${selectedSize} is not available.` });
    }

    // Validate requested quantity against available stock
    if (quantity > product.sizes[selectedSize]) {
      return res.status(400).json({
        error: `Only ${product.sizes[selectedSize]} Stock available for size ${selectedSize}.`,
      });
    }





    // Remove the item if quantity is 0
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category ? product.category.categoryOffer || 0 : 0;
      const effectiveOffer = Math.max(productOffer, categoryOffer);

      const discount = (product.regularPrice * effectiveOffer) / 100;
      const salePrice = product.regularPrice - discount;

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = salePrice;
      cart.items[itemIndex].totalPrice = salePrice * quantity;
    }

    await cart.save();

    // Recalculate cart total and total discount
    const updatedCartTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = cart.items.reduce(
      (sum, item) =>
        sum +
        ((item.productId.regularPrice * Math.max(
          item.productId.productOffer || 0,
          item.productId.category ? item.productId.category.categoryOffer || 0 : 0
        )) /
          100) *
          item.quantity,
      0
    );

    res.status(200).json({
      message: "Cart Updated successfully",
      cartItems: cart.items,
      total: updatedCartTotal.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error from update cart" });
  }
};




//funtion for generate OTP
function generateOtp() {
  return Math.floor(3000 + Math.random() * 900).toString();
}

const loadSignup = async (req, res) => {
  console.log("load signup");
  try {
    if (req.session.user) {
      return res.redirect("/");
    } else {
      return res.render("signup");
    }
  } catch (error) {
    console.log("error from login page");
    res.status(500).send("Server error");
  }
};
//function for sendvaerificaationemail(function to create a Transporter who will send the mail )

async function sendVerificationEmail(email, otp) {
  try {
    const mailTransporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      auth: {
        user: "aneesanu2006@gmail.com",
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailDetails = {
      from: "aneesanu2006@gmail.com",
      to: email,
      subject: "VERIFY YOUR ACCOUNT",
      text: `YOUR OTP IS ${otp}`,
      html: `<b>YOUR OTP IS ${otp}</b>`,
    };

    const info = await mailTransporter.sendMail(mailDetails);

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

//submit the signup form 
const submitSignup = async (req, res) => {
  try {
    const { name, password, phone, email } = req.body;

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.status(400).json({ error: "Email already exist" });
    }

    const otp = generateOtp();
    console.log(otp);
    const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(400).json({ error: " sending email-error" });
    }

    req.session.userotp = otp;
    req.session.expire = otpExpiration;
    req.session.userdata = { name, email, password, phone };

    const start = true;
    res.status(200).json({ start });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get verify otp page
const getVerifyOTP = (req, res) => {
  try {
    if (req.session.user) {
      res.redirect("/");
    } else {
      const start = true;
      res.render("verify-otp", { start });
    }
  } catch (error) {
    console.log(error);
  }
};



// load login page
const loadLogin = async (req, res) => {
  try {
    console.log("login page");
    if (!req.session.user) {
      return res.render("signup");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    res.redirect("/page-404");
  }
};
// submit login form
const submitLogin = async (req, res) => {
  try {
    console.log("from user side");
    const { email, password } = req.body;
    console.log(email, password);

    const user = await User.findOne({ isAdmin: 0, email: email });
    const categories = await Category.find({ isListed: true });

    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    }).populate("category");

    productData.sort((a, b) => b.createdAt - a.createdAt);
    productData = productData.slice(0, 7);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Email does not exist" });
    }
    if (user.isBlocked) {
      return res
        .status(403)
        .json({ success: false, message: "User is blocked by admin" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    req.session.user = user._id; // Store full user data in session
    console.log(req.session.user);

    // Success response
    return res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Error occurred while login", error);
    return res
      .status(500)
      .json({ success: false, message: "Login failed, please try again" });
  }
};


// logout the session

const logOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("error at session destroying", err.message);
        return res.redirect("/page-404");
      }
    });
    return res.redirect("/signup");
  } catch (error) {
    console.log("Logout error", error);
    return res.redirect("/page-404");
  }
};

// step 2, for hash password

const securePassword = async (password) => {
  try {
    const passwordHash = bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error);
  }
};

// step :1 , check the frondend user otp is equal to backend otp / verify otp
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userotp || !req.session.expire) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please resend OTP.",
      });
    }

    const currentTime = Date.now();

    if (currentTime > req.session.expire) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired. Please resend." });
    }

    if (otp === req.session.userotp) {
      const user = req.session.userdata;
      const passwordHash = await securePassword(user.password);

      const saveUserdata = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
        phone: user.phone,
      });
      await saveUserdata.save();

      req.session.user = saveUserdata._id;
      console.log("In verify otp:", req.session.user);
      req.session.userotp = null; // Clear OTP
      req.session.expire = null;

      return res.json({ success: true, redirectUrl: "/" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during OTP verification.",
    });
  }
};


const resendOtp = async (req, res) => {
  try {
    const user = req.session.userdata;

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please signup again.",
      });
    }

    const otp = generateOtp();
    console.log(otp);
    const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes

    const emailSent = await sendVerificationEmail(user.email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Try again later.",
      });
    }

    req.session.userotp = otp;
    req.session.expire = otpExpiration;

    return res.json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while resending OTP.",
    });
  }
};



// for unrelated routes

module.exports = {
  loadHomepage,
  loadShoppage,
  addTocart,
  getCartpage,
  updateCart,
  loadSignup,
  submitSignup,
  getVerifyOTP,
  verifyOTP,
  resendOtp,
  loadLogin,
  submitLogin,
  logOut,
  productDetails,
 
};
