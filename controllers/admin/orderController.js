const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')


const getOrders = async(req,res)=>{
    console.log("from get orders backend")

    try {
        // Extract query parameters for pagination and search
        const { page = 1, limit = 10, keyword = '', status } = req.query;

        // Convert page and limit to integers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        // Build search filter
        const searchQuery = keyword
            ? {
                  $or: [
                      { orderId: { $regex: keyword, $options: "i" } }, // Match order ID
                      { "address.name": { $regex: keyword, $options: "i" } }, // Match customer name
                      { "address.city": { $regex: keyword, $options: "i" } }, // Match city
                  ],
              }
            : {};

        // Add status filter if provided
        if (status) {
            searchQuery.status = status;
        }

        // Count total orders for pagination
        const totalOrders = await Order.countDocuments(searchQuery);

        // Fetch orders with pagination
        const orders = await Order.find(searchQuery)
            .populate("userId", "name email") // Populate user details
            .populate("orderedItems.product") // Populate product details
            .sort({ createdOn: -1 }) // Sort by creation date (newest first)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / limitNumber);

        // Render EJS template with fetched orders and pagination info
        res.render("admin-orders", {
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: pageNumber,
                limit: limitNumber,
            },
            search: {
                keyword,
                status,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}


const orderUpdate  = async(req,res)=>{
        console.log("order updating.............")
    const {id} = req.params
    const {status}  = req.body
    console.log("id------>",id)
    console.log("status--------->",status)
    try {
        const order = await Order.findByIdAndUpdate(id,{status},{new:true})

        if(status ==='Cancelled' || status ==='cancelled'){
            console.log("Processing wallet refund.......")

            let wallet = await Wallet.findOne({userId:order.userId})

            wallet.balance += order.finalAmount;

            wallet.transactions.push({
                amount:order.finalAmount,
                type:"credit"
            })

            await wallet.save()
            console.log("wallet update succesfully...")
        }

        if(order){
            return res.status(200).json({message:"Order status updated succesfully",order})

        }
        res.status(404).json({message:"Order not found"})
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { 
    getOrders,
    orderUpdate,
}