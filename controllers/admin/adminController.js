const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const Order = require('../../models/orderSchema')
const PDFDocument = require('pdfkit');
const excel = require('exceljs')
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const storage = require("../../helpers/multer");
const sharp = require("sharp");
const uploads = multer({ storage });
const { jsPDF } = require("jspdf");


const pageError = (req,res)=>{
    res.render('admin-error')
}



// admin login 
const loadLogin = async (req,res)=>{
    
        if(req.session.admin){                      //check the admin is already loggined
            return res.redirect('/admin/dashboard')
        }


        return res.render('admin-login',{message:"null"}) // here there is no chance to become error while loding a admin login page thats why catch block is not here


}

//admin login submit
const adminlogin = async(req,res)=>{
    console.log('from admin login side')
    try {
      const   {email,password}  = req.body
      console.log("first")
      const admindata = await User.findOne({email,isAdmin:true})
      console.log("admin data,,",admindata)
      console.log('old pass',admindata.password)
      console.log('new password',password)
      console.log("sec")
      if(admindata){
        const passwordMatch = await  bcrypt.compare(password,admindata.password)// first password is destrucring pass, 2nd - find from admindata through query
        console.log('match',password)
       if(passwordMatch){
        req.session.admin = true 
        return res.redirect('/admin/dashboard')
       }else{
        return res.render('admin-login',{message:'password is incorrect'})
       }
      }else{
        return res.render('admin-login',{message:'email is incorrect'})
      }

    } catch (error) {
        console.error("login error",error)
        return res.redirect('/admin/pageerror')
    } 
}

// admin logout 
const adminLogout = (req,res)=>{
    console.log("going  to logout")
   try {
    req.session.destroy((err)=>{
        if(err){
            console.log("error from session destroy",err)
            return res.redirect('/admin/pageerror')
        }
        return res.redirect('/admin') 
    })
   } catch (error) {
        console.log("unexpeced error during logout",error)
        res.redirect("/admin/pageerror")
   }
}

// dashBoard getting
const loadDashboard  =  async (req,res) =>{
    if(req.session.admin){
        try {
              const orders = await Order.find().populate("userId");
               // Calculate totals
        let totalSales = 0;
        let totalDiscounts = 0;
        let couponDeductions = 0;

        orders.forEach(order => {
            totalSales += order.finalAmount;
            totalDiscounts += order.discount;
            couponDeductions += order.couponOffer;
        });

        const totalUsers = await User.find().countDocuments()

        const topProductsPromise = Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $group: {
                    _id: "$orderedItems.product",
                    totalQuantity: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
        ]);

        const topCategoriesPromise = Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalQuantity: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            { $unwind: "$categoryDetails" },
            { $sort: { totalQuantity: -1 } },
            { $limit: 3 },
        ]);

        const [topProducts, topCategories] = await Promise.all([topProductsPromise, topCategoriesPromise]);

        res.render('dashboard', {
            getsalesReport:orders,
            totalSales,
            totalDiscounts,
            couponDeductions,
            totalUsers,
            topProducts,
            topCategories,
          
        });
        } catch (error) {
            return res.redirect('/admin-error')
        }
    }
}
const dashboardFilterResults  = async(req,res)=>{
    try {
         const { filter, startDate, endDate } = req.query; // Extract filter criteria
                   
                 
                 // Define the date filter based on the selected criteria
        
        
                let dateFilter = {};
                if (filter === "daily") {
                    dateFilter = { 
                        invoiceDate: { 
                            $gte: new Date().setHours(0, 0, 0), 
                            $lte: new Date() 
                        } 
                    };
                } else if (filter === "weekly") {
                    console.log("filter weekly")
                    const startOfWeek = new Date();
                    startOfWeek.setDate(startOfWeek.getDate() - 7);
                    dateFilter = { invoiceDate: { $gte: startOfWeek, $lte: new Date() } };
                } else if (filter === "monthly") {
                    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                    dateFilter = { invoiceDate: { $gte: startOfMonth, $lte: new Date() } };
                } else if (filter === "yearly") {
                    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
                    dateFilter = { invoiceDate: { $gte: startOfYear, $lte: new Date() } };
                } else if (filter === "custom" && startDate && endDate) {
                    dateFilter = { 
                        invoiceDate: { 
                            $gte: new Date(startDate), 
                            $lte: new Date(endDate) 
                        } 
                    };
                }
                const orders = await Order.find(dateFilter).populate("userId");
        
                // Calculate totals
                let totalSales = 0;
                let totalDiscounts = 0;
                let couponDeductions = 0;
        
                orders.forEach(order => {
                    totalSales += order.finalAmount;
                    totalDiscounts += order.discount;
                    couponDeductions += order.couponOffer;
                });
         
                res.json({
                    salesReport:orders,
                    totalSales,
                    totalDiscounts,
                    couponDeductions,
                })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching sales data.' });
    }
}

module.exports = {
    loadLogin,
    adminlogin,
    loadDashboard,
    adminLogout,
    pageError,
    dashboardFilterResults,
}