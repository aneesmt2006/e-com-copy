const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
// const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController");
const orderController  = require('../controllers/admin/orderController')
const couponController  = require('../controllers/admin/couponController')
const salesController  =  require('../controllers/admin/salesController')
const returnsController = require('../controllers/admin/returnsController')
const {  adminAuth } = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({ storage: storage });
// const uploads = multer({storage:storage})
//.............
const { upload } = require("../config/cloudinary");

router.get("/pageerror", adminController.pageError);
//LOGIN MANAGEMENT
router.get("/", adminController.loadLogin);
router.post("/adminlogin", adminController.adminlogin);
router.get("/adminlogout", adminController.adminLogout);

// DASHBOARD
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get('/dashboard-filter',adminAuth,adminController.dashboardFilterResults)



// CUSTOMER MANAGEMENT
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockcustomer/:id", adminAuth, customerController.customerBlocked);
router.get(
  "/unblockcustomer/:id",
  adminAuth,
  customerController.customerUnblocked
);

//CATEGORY MANAGEMENT
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post(
  "/addCategoryOffer",
  adminAuth,
  categoryController.addCategoryOffer
);
router.post(
  "/removeCategoryOffer",
  adminAuth,
  categoryController.removeCategoryOffer
);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

//PROODUCT MANAGEMENT
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post(
  "/addProducts",
  adminAuth,
  uploads.any(),
  productController.addProducts
);
router.get('/products',adminAuth,productController.getallProducts)
router.post('/blockProduct',adminAuth,productController.blockProduct)
router.post('/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/editProduct',adminAuth,productController.editProduct)
router.post('/ediProduct/:id',adminAuth,uploads.any(),productController.addEditProduct)
router.post('/update-offer',adminAuth,productController.updateOffer)
router.post('/remove-offer',adminAuth,productController.removeOffer)

// ORDER MANAGEMENT 
router.get('/getOrders',adminAuth,orderController.getOrders)
router.patch('/orderUpdate/:id',adminAuth,orderController.orderUpdate)


// COUPON MANAGEMENT 
router.get('/coupon',adminAuth,couponController.getCouponPage)
router.post('/addCoupon',adminAuth,couponController.addCoupon)
router.get('/getCouponData/:couponId',adminAuth,couponController.getCouponData)
router.put('/editCoupon/:couponId',adminAuth,couponController.editCoupon)
router.delete('/deleteCoupon/:couponId',adminAuth,couponController.deleteCoupon)


//SALES REPORT
router.get('/sales',adminAuth,salesController.getSalesReport)
router.get('/sales-filter',adminAuth,salesController.salesFilter)
router.get('/sales-filter-pdf',adminAuth,salesController.salesFilterPDF)
router.get('/sales-filter-excel',adminAuth,salesController.salesFilterExcel);

// RETURN  ORDERS
router.get('/returns',adminAuth,returnsController.getReturns)
router.post('/update-return-request',adminAuth,returnsController.returnRequest)



module.exports = router;
