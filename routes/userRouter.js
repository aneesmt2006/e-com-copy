const express = require("express")
const router = express.Router()
const userController = require("../controllers/user/userController")
const userAccount = require('../controllers/user/userAccount')
const addressController = require('../controllers/user/addressController')
const checkoutController = require('../controllers/user/checkoutController')
const orderController  = require('../controllers/user/orderController')
const couponController = require('../controllers/user/couponController')
const forgotPasswordController = require('../controllers/user/forgotPasswordController')
const walletController = require('../controllers/user/walletController')
const wishlistController = require('../controllers/user/wishlistController')
const passport = require("passport")
const { userAuth, adminAuth } = require("../middlewares/auth")


router.get('/', userController.loadHomepage)
router.get('/login',userController.loadLogin)
router.post('/login',userController.submitLogin)
router.get('/logout',userController.logOut)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.submitSignup)
router.get('/verify-otp',userController. getVerifyOTP)
router.post('/verify-otp',userController. verifyOTP)
router.post('/resend-otp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/signup'}), (req, res) => {
    console.log('Google auth user credential==>',req.user)
    req.session.user = req.user._id;  // Store the full user object
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
        }
        res.redirect('/')
    });
})
router.get('/forgotPassword',forgotPasswordController.getForgotPassPage)
router.post('/forgot-email-valid',forgotPasswordController.forgotEmailValid)
router.get('/getForgotVerifyOtp',forgotPasswordController.getForgotVerifyOtp)
router.post('/forgotVerifyOTP',forgotPasswordController.forgotVerifyOTP)
router.get('/forgotConfirmPswrd',forgotPasswordController.getConfirmPswrdPage)
router.post('/forgotConfirmPswrd',forgotPasswordController.passwordConfirmation)
router.post('/forgot-resend-otp',forgotPasswordController.resendOtp)



//shop page 
router.get('/shop',userAuth,userController.loadShoppage)

// product details
router.get('/productDetails',userAuth,userController.productDetails)

//cart management
router.post('/addtoCart',userAuth,userController.addTocart)//add to cart
router.get('/cart',userAuth,userController.getCartpage)//get cart page
router.post('/cart/update',userAuth,userController.updateCart)


//wishlist 
router.get('/wishlist',userAuth,wishlistController.getWishlist)
router.post('/addToWishlist',userAuth,wishlistController.addToWishlist)
router.delete('/removeWishlist/:productId',userAuth,wishlistController.removeWishlist)


//user profile
router.get('/profile',userAuth,userAccount.getProfile)
router.post('/profile/edit',userAuth,userAccount.updateUserDetails)


// address
router.get('/address',userAuth,addressController.getAddresses)
router.get('/addressesOfUser/:addressId',userAuth,addressController.getAddressesOfUser)
router.get('/addressOfUser/:addressId',userAuth,addressController.getAddressOfUser)
router.post('/address/add',userAuth,addressController.addAddresses)
router.put('/address/edit/:addressId',addressController.editAddress)
router.delete('/address/delete/:addressId', addressController.deleteAddress);



//account-details
router.get('/account',userAuth,userAccount.getAccount)



//coupon 
router.post('/apply-coupon',userAuth,couponController.applyCoupon)
router.delete('/remove-coupon',userAuth,couponController.removeCoupon)


// checkout 
router.get('/checkout',userAuth,checkoutController.getCheckoutPage)


// orders
router.get('/orders',userAuth,userAccount.getOrders)
router.get('/check-auth', userAuth, (req, res) => {
    res.json({ status: 'authenticated' });
  });
router.post('/orderPlacing',userAuth,orderController.orderPlacing)
router.get('/orderConfirm/:orderId',userAuth,orderController.getOrderConfirmation)
router.post('/verifyPayment',userAuth,orderController.verifyPayment)
router.put('/orderCancelling/:orderId',userAuth,orderController.orderCancelling)
router.post('/retry-payment',userAuth,orderController.retryPayment)
router.post('/verifyPayment-retry',userAuth,orderController.verifyRetry)
router.post('/returnOrder',userAuth,orderController.returnOrder)
router.get('/generate-invoice/:orderId',userAuth,orderController.invoiceDowload)


// wallet 
router.get('/wallet',userAuth,walletController.getWallet)
router.post('/addWallet',userAuth,walletController.addWallet)


//unrelated routes
// router.get('*',userController.notFound)












module.exports = router