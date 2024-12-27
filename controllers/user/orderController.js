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
const PDFDocument = require('pdfkit')

const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id:process.env.RAZORPAY__KEY_ID,
  key_secret:process.env.RAZORPAY__SECRET_KEY,

});


const orderPlacing = async (req, res) => {
  console.log("Order placing function from backend");
  const userId = req.session.user;
  const { cartItems, address, paymentMethod, totalPrice} = req.body;
  console.log("selected payment method=======> ",paymentMethod)

  console.log('totalPice---------->',totalPrice)

  console.log('address------------>',address)

  console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',cartItems)


  try {
    // Validate address
    console.log("one one")
    const addresses = await Address.findOne({ userId, "address._id": address });
    console.log("address from DB --->",addresses)
    if (!addresses) {
      console.log('one')
      return res.status(400).json({ message: "Address details are required." });
    }
    const addressToSave = addresses.address.filter((add) => add._id == address);

    console.log('save address-------',addressToSave)

    // Validate payment method
    if (!paymentMethod) {
      console.log(2)
      return res.status(400).json({ message: "Please choose a payment method." });
    }
// ...................just commented while doing retry payment - the cart is always empty...............
    // Validate cart items
    if (!cartItems || cartItems.length === 0) {
      console.log(3)
      return res.status(400).json({ message: "Your cart is empty. Add items to proceed." });
    }
// .......................................................................................................


     console.log('two two ')
    // let totalPrice = 0;
    for (const item of cartItems) {
      const product = await Product.findById(item.productId._id);
      console.log('three three')
      if (!product || product.isBlocked || product.status !== "Available") {
        console.log('four four ')
        return res.status(404).json({ message: `Product ${item.productId._id} is unavailable.` });
      }

      // Check stock for specific size
      // const sizeStock = product.sizes[item.size];
      // if (!sizeStock || sizeStock < item.quantity) {
      //   console.log('stock')
      //   return res.status(400).json({ message: `Insufficient stock for ${product.productName} (Size: ${item.size}).` });
      // }

      // totalPrice += item.price * item.quantity;
    }

    // Deduct stock for ordered items
    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        const sizeKey = `sizes.${item.size}`;
        await Product.findByIdAndUpdate(item.productId, { $inc: { [sizeKey]: -item.quantity } });
      }
    }

    const orderedItems = cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size,
    }));
    console.log('final')



    // ...........................................
     // Handle Wallet Payment
     if (paymentMethod === "wallet") {
      console.log("Processing wallet payment...");

      // Check wallet balance
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < totalPrice) {
        return res.status(400).json({error:"insufficient_balance", message: "Insufficient wallet balance." });
      }

      // Deduct balance and log transaction
      wallet.balance -= totalPrice;
      wallet.transactions.push({
        amount: totalPrice,
        type: "debit",
        createdAt: new Date(),
      });
      await wallet.save();

      // Save order
      const discount = cartItems.reduce((acc, curr) => acc + curr.itemDiscount, 0);
      const couponOffer = req.session.couponData ? req.session.couponData.discount : 0;
      const newOrder = new Order({
        userId,
        orderedItems: cartItems.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.totalPrice,
          size: item.size,
        })),
        totalPrice,
        finalAmount: totalPrice,
        paymentMethod: "Wallet",
        address: addressToSave[0],
        status: "Placed",
        invoiceDate: new Date(),
        couponOffer,
        discount: discount + couponOffer,
      });

      await newOrder.save();

      // Clear user's cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      return res.status(200).json({
        message: "Order placed successfully using Wallet!",
        orderId: newOrder._id,
      });
    }

    // ...........................................
    if (paymentMethod === "cashonDelivery") {
      console.log('coddddddddddd')
      // Handle Cash on Delivery
      const discount = cartItems.reduce((acc,curr)=> acc += curr.itemDiscount, 0)
      const couponOffer = req.session.couponData ? req.session.couponData.discount : 0
      const newOrder = new Order({
        userId,
        orderedItems,
        totalPrice : totalPrice,
        finalAmount: totalPrice,
        paymentMethod: "COD",
        address: addressToSave[0],
        status: "Placed",
        invoiceDate: new Date(),
        couponOffer,
        discount: discount + couponOffer
      });

      const saveOrder = await newOrder.save();

      // Clear user's cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      res.status(200).json({
        message: "Order placed successfully with Cash on Delivery!",
        orderId: saveOrder._id,
      });
    } else if (paymentMethod === "paypal") {
      console.log("payment................")
      const discount = cartItems.reduce((acc,curr)=> acc += curr.itemDiscount, 0)
      const couponOffer = req.session.couponData ? req.session.couponData.discount : 0
      // Handle Razorpay
      const razorpayOrder = await razorpay.orders.create({
        amount: totalPrice * 100, // Amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      console.log("Razorpay Order Created:", razorpayOrder);

      const newOrder = new Order({
        userId,
        orderedItems,
        totalPrice : totalPrice,
        finalAmount: totalPrice,
        paymentMethod: "Razorpay",
        razorpayOrderId: razorpayOrder.id,
        address: addressToSave[0],
        status: "Pending Payment",
        invoiceDate: new Date(),
        couponOffer,
        discount: discount + couponOffer
      });

      const saveOrder = await newOrder.save();

      // Don't clear the cart for Razorpay until payment is confirmed
      res.status(200).json({
        message: "Razorpay Order created successfully!",
        orderId: razorpayOrder.id,
        id:newOrder._id,
        amount: razorpayOrder.amount,
        razorpayKey: process.env.RAZORPAY__KEY_ID,
      });
    } else {
      return res.status(400).json({ message: "Invalid payment method!" });
    }
  } catch (error) {
    console.error("Error placing order backend:", error);
    res.status(500).json({
      message: "Internal server error. Please try again later.",
    });
  }
};


// verify payment 
const secretKey = "je6WujZZjskiZqWWWPo8Whbz"
const verifyPayment = async (req, res) => {
  console.log('from verify payment razor  >>>>>>>>>>>>>>>>>>>>>')
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  console.log(razorpayOrderId)
  console.log(razorpayPaymentId)
  console.log(razorpaySignature)



  try {
    // Update order status to "Placed" after successful payment
    const order = await Order.findOneAndUpdate(
      {_id:razorpayOrderId},
      { status: "Placed" },
      { new: true }
    );
      console.log("check the order is or not ?????")
    if (!order) {
      console.log('there is no order')
      return res.status(404).json({ message: "Order not found!" });
    }

    // Clear the user's cart
    await Cart.findOneAndUpdate({ userId: order.userId }, { $set: { items: [] } });
    console.log("after the cart cleared")

    res.status(200).json({ message: "Payment verified and order placed!",razorpayOrderId});
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};


// order confirmation
const getOrderConfirmation = async (req, res) => {
  console.log("from get confirmation page");
  const userId = req.session.user;
  const orderId = req.params.orderId;

  console.log(orderId, typeof orderId);

  try {
    const orderData = await Order.findOne({ _id: orderId }).populate(
      "orderedItems.product"
    );

    if (!orderData) {
      console.error("Order not found for ID:", orderId);
      return res.status(404).send("Order not found");
    }

    // Calculate Total Discount
    const totalDiscount = orderData.discount

    console.log("Total Discount:", totalDiscount);

    req.session.couponData = null
    console.log('coupon final ------------',req.session.couponData)
    res.render("confirmation", {
      orderData: orderData,
      totalDiscount: totalDiscount.toFixed(2), // Pass discount to the frontend
    });
  } catch (error) {
    console.error("Error fetching order data:", error);
    res.status(500).send("Internal Server Error");
  }
};


// order cancelling 

const orderCancelling = async (req, res) => {

  console.log("message from order cancelling backend....")
  const { orderId } = req.params; // Get order ID from params
  const userId = req.session.user; // Asssume user ID is extracted from the authenticated user session

  try {
      // Find the order
      const order = await Order.findOne({ _id: orderId, userId }).populate('orderedItems.product')
      if (!order) {
          return res.status(404).json({ message: "Order not found or not authorized to cancel." });
      }

      // // Ensure the order can be cancelled
      // if (order.status !== 'Placed' && order.status !== 'Shipped') {
      //     return res.status(400).json({ message: "Order cannot be cancelled at this stage." });
      // }

      // Update order status to "Cancelled"
      order.status = 'Cancelled';
      await order.save();

      // Process wallet credit
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
          // Create a new wallet if none exists
          wallet = new Wallet({
              userId,
              balance: 0,
              transactions: [],
          });
      }

      // Credit the refund amount
      wallet.balance += order.finalAmount;

      // Add transaction record
      wallet.transactions.push({
          amount: order.finalAmount,
          type: 'credit',
          createdAt: new Date(),
      });

      await wallet.save();

       // Update product quantities
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.sizes[item.size] += item.quantity;
        await product.save();
      }
    }

      res.status(200).json({ message: "Order cancelled and amount credited to wallet.", wallet });
  } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: "Internal server error." });
  }
};


// const retryPayment = async (req, res) => {
//   const userId = req.session.user; // Logged-in user's ID
//   console.log("from retry payment");
//   const { orderId } = req.query; // Extract orderId from query params
//   console.log("retry payment orderId:", orderId);

//   try {
//     // Fetch the order by ID
//     const orderData = await Order.findById({ _id: orderId });

//     console.log('retry saved orderData......',orderData)

  //   console.log("Order Data Address:<<<<<<<<<", orderData.address);

  //   if (!orderData) {
  //     return res.status(404).json({ message: "Order not found." });
  //   }

   
  //   // Find the address that matches the order's address
  //   const matchingAddress = await Address.findOne({
  //     userId,
  //     address: {
  //       $elemMatch: {
  //         name: orderData.address.name,
  //         streetAddress: orderData.address.streetAddress,
  //         city: orderData.address.city,
  //         state: orderData.address.state,
  //         pincode: parseInt(orderData.address.pincode, 10), // Ensure numeric type
  //         phone: orderData.address.phone,
  //       },
  //     },
  //   });
  //   console.log("Matching Address Document:", matchingAddress);

  //   if (!matchingAddress) {
  //     return res.status(404).json({ message: "Matching address not found." });
  //   }

  //   // Extract the ID of the matching address
  //   const addressId = matchingAddress.address.find(
  //     (addr) =>
  //       addr.name === orderData.address.name &&
  //       addr.streetAddress === orderData.address.streetAddress &&
  //       addr.city === orderData.address.city &&
  //       addr.state === orderData.address.state &&
  //       addr.pincode === parseInt(orderData.address.pincode, 10) &&
  //       addr.phone === orderData.address.phone
  //   )?._id;

  //   if (!addressId) {
  //     return res.status(404).json({ message: "Matching address ID not found." });
  //   }



  //   const formattedData = {
  //     cartItems: orderData.cartItems || [],
  //     address: addressId || "", // Include the address ID
  //     paymentMethod: orderData.paymentMethod || "",
  //     totalPrice: orderData.totalPrice || 0,
  //   };

  //   console.log("order data formatted for retry:", formattedData);
  //   return res.status(200).json({ message: true, orderData: formattedData });
//   } catch (error) {
//     console.error("Error in retry payment:", error.message);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };


const retryPayment = async (req, res) => {
  const userId = req.session.user; // Logged-in user's ID
  const { orderId } = req.query; // Extract orderId from query params
  console.log("Retry payment for orderId:", orderId);

  try {
    // Fetch the order by ID
    const orderData = await Order.findOne({ _id: orderId, userId });

    if (!orderData) {
      return res.status(404).json({ message: "Order not found or access denied." });
    }

    // if (orderData.status !== "Pending Payment") {
    //   return res.status(400).json({ message: "Retry payment is not applicable for this order." });
    // }

    console.log("Order details for retry:", orderData);

    // Generate a new Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: orderData.finalAmount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    console.log("New Razorpay order created:", razorpayOrder);

    // Update the order with the new Razorpay order ID
    await Order.updateOne(
      { _id: orderId },
      { $set: { razorpayOrderId: razorpayOrder.id, status: "Placed" } }
    );


    console.log("////////////////",
     " orderId:", razorpayOrder.id,
      "amount: ",razorpayOrder.amount,
     " razorpayKey:",secretKey,
     " id:", orderId,)
    // Send the new Razorpay order details to the client
    // const keyId = "rzp_test_sJTt70FDN0xwOs"
    res.status(200).json({
      message: "Retry payment initiated successfully.",
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      razorpayKey:process.env.RAZORPAY__KEY_ID,
      id: orderId,
    });
  } catch (error) {
    console.error("Error in retry payment:", error);
    res.status(500).json({ message: "Internal server error."});
  }
};


const verifyRetry = async(req,res)=>{
  console.log('from verify Retry paymnent.....')
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  console.log(razorpayOrderId)
  console.log(razorpayPaymentId)
  console.log(razorpaySignature)

  try {
    // Update order status to "Placed" after successful payment
    const order = await Order.findOneAndUpdate(
      {_id:razorpayOrderId},
      { status: "Placed" },
      { new: true }
    );
      console.log("check the order is or not ?????")
    if (!order) {
      console.log('there is no order')
      return res.status(404).json({ message: "Order not found!" });
    }

      // Clear the user's cart
    await Cart.findOneAndUpdate({ userId: order.userId }, { $set: { items: [] } });

    res.status(200).json({ message: "Payment verified and order placed!",razorpayOrderId});
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }


}

const returnOrder = async (req, res) => {
  try {
    const { orderId, reason, comment } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order is not eligible for return' });
    }

    const daysSinceDelivery = (new Date() - new Date(order.createdOn)) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      return res.status(400).json({ success: false, message: 'Return period has expired' });
    }

    order.returnRequest = {
      status: 'Pending',
      reason: reason,
      comment: comment,
      createdAt: new Date()
    };

    await order.save();

    res.json({ success: true, message: 'Return request submitted successfully' });
  } catch (error) {
    console.error('Error processing return request:', error);
    res.status(500).json({ success: false, message: 'An error occurred while processing the return request' });
  }
};


const invoiceDowload =  async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('orderedItems.product')
      .populate('userId', 'email');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
    doc.pipe(res);

    // Header section
    doc.fontSize(24).text('INVOICE', 50, 50);
    
    // Order dates (right aligned)
    doc.fontSize(10)
      .text(`Order Date: ${new Date(order.createdOn).toLocaleDateString()}`, 400, 50)
      .text(`Delivery By: ${new Date(order.createdOn).toLocaleDateString()}`, 400, 65);
    
    // Add horizontal line
    doc.moveTo(50, 85).lineTo(550, 85).stroke();

    // Billing and Shipping Information
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To', 50, 100);
    doc.fontSize(10).font('Helvetica')
      .text(order.address.name, 50, 120)
      .text(order.userId.email, 50, 135);

    doc.fontSize(12).font('Helvetica-Bold').text('Ship To', 300, 100);
    doc.fontSize(10).font('Helvetica')
      .text('Home', 300, 120)
      .text(order.address.streetAddress, 300, 135)
      .text(`${order.address.city}, ${order.address.state} ${order.address.pincode}`, 300, 150)
      .text(`Phone: ${order.address.phone}`, 300, 165);

    // Order Details section
    doc.fontSize(12).font('Helvetica-Bold').text('Order Details', 50, 200);
    
    // Order Details Table
    const tableTop = 225;
    const tableHeaders = ['Product', 'Variant', 'Qty', 'Price', 'Discount', 'Total', 'Status'];
    const columnWidths = [100, 120, 40, 70, 70, 70, 70];
    let xPosition = 50;

    // Draw headers
    doc.fontSize(10).font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      doc.text(header, xPosition, tableTop);
      xPosition += columnWidths[i];
    });

    // Draw header underline
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Draw table content
    let yPosition = tableTop + 25;
    doc.fontSize(10).font('Helvetica');

    order.orderedItems.forEach(item => {
      xPosition = 50;
      doc.text(item.product.productName, xPosition, yPosition);
      xPosition += columnWidths[0];
      
      doc.text(item.size, xPosition, yPosition);
      xPosition += columnWidths[1];
      
      doc.text(item.quantity.toString(), xPosition, yPosition);
      xPosition += columnWidths[2];
      
      doc.text(`RS ${item.price.toFixed(2)}`, xPosition, yPosition);
      xPosition += columnWidths[3];
      
      doc.text(`${((order.discount / order.orderedItems.length) / item.price * 100).toFixed(0)}%`, xPosition, yPosition);
      xPosition += columnWidths[4];
      
      doc.text(`RS ${(item.price * item.quantity).toFixed(2)}`, xPosition, yPosition);
      xPosition += columnWidths[5];
      
      doc.text(order.status, xPosition, yPosition);
      
      yPosition += 20;
    });

    // Draw bottom line after table
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

    // Order Summary section (right aligned)
    doc.fontSize(12).font('Helvetica-Bold').text('Order Summary', 400, yPosition + 20);
    
    const summaryStartY = yPosition + 45;
    doc.fontSize(10).font('Helvetica');
    
    // Summary lines with right alignment
    doc.text('Subtotal:', 350, summaryStartY);
    doc.text(`RS ${order.totalPrice.toFixed(2)}`, 500, summaryStartY, { align: 'right' });
    
    doc.text('Shipping Fee:', 350, summaryStartY + 20);
    doc.text('RS 0.00', 500, summaryStartY + 20, { align: 'right' });
    
    doc.text('Coupon Discount:', 350, summaryStartY + 40);
    doc.text(`RS ${order.couponOffer.toFixed(2)}`, 500, summaryStartY + 40, { align: 'right' });
    
    // Add line above total
    doc.moveTo(350, summaryStartY + 60).lineTo(550, summaryStartY + 60).stroke();
    
    doc.text('Total:', 350, summaryStartY + 70);
    doc.text(`RS ${order.finalAmount.toFixed(2)}`, 500, summaryStartY + 70, { align: 'right' });

    // Payment Information section
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Information', 50, summaryStartY + 100);
    doc.moveTo(50, summaryStartY + 120).lineTo(550, summaryStartY + 120).stroke();
    
    doc.fontSize(10).font('Helvetica');
    doc.text('Payment Method:', 50, summaryStartY + 130);
    doc.text(order.paymentMethod, 150, summaryStartY + 130);
    
    doc.text('Payment Status:', 50, summaryStartY + 150);
    doc.text(order.status === 'Delivered' ? 'Paid' : order.status, 150, summaryStartY + 150);
    
    doc.moveTo(50, summaryStartY + 170).lineTo(550, summaryStartY + 170).stroke();

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Error generating invoice');
  }
}







module.exports = {
  orderPlacing,
  getOrderConfirmation,
  verifyPayment,
  orderCancelling,
  retryPayment,
  verifyRetry,
  returnOrder,
  invoiceDowload,
};
