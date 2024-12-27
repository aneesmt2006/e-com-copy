const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet  = require('../../models/walletSchema')
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const { ConstantColorFactor } = require("three");
const { default: mongoose } = require("mongoose");












const getReturns =  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10; // Number of items per page
      const skip = (page - 1) * limit;
  
      // Fetch only orders with valid return request status
    const returnRequests = await Order.find({ 
      'returnRequest.status': { $in: ['Pending', 'Approved', 'Rejected'] } // Check specific statuses
    })
      .sort({ 'returnRequest.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name');
  
      const totalRequests = await Order.countDocuments({ 
        'returnRequest.status': { $in: ['Pending', 'Approved', 'Rejected'] } 
      });
      const totalPages = Math.ceil(totalRequests / limit);
  
      res.render('admin-returns', {
        order:returnRequests,
        returnRequests,
        currentPage: page,
        totalPages,
        totalRequests
      });
    } catch (error) {
      console.error('Error fetching return requests:', error);
      res.status(500).send('Server error');
    }
  };


//   // Update return request status
const returnRequest = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.returnRequest.status = status;
    
    if (status === 'Approved') {
      // Process refund for Wallet or Razorpay or PayPal payments
      if (order.paymentMethod === 'Wallet' || order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Paypal') {
        const wallet = await Wallet.findOne({ userId: order.userId });
        if (wallet) {
          wallet.balance += order.finalAmount;
          wallet.transactions.push({
            amount: order.finalAmount,
            type: 'credit',
            description: `Refund for order ${order.orderId}`
          });
          await wallet.save();
        }
      }
      order.status = 'Returned';
    } else if (status === 'Rejected') {
      order.status = 'Rejected';
    }

    await order.save();

    res.json({ success: true, message: 'Return request updated successfully' });
  } catch (error) {
    console.error('Error updating return request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
  module.exports ={ 
    getReturns,
    returnRequest
  }