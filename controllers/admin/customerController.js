const User = require('../../models/userSchema')


const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = req.query.page;
        }

        const limit = 6;

        // Fetching customer data from the database
        const userdata = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ],
        })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

        // Counting the total number of documents that match the search criteria
        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ],
        }).countDocuments();

        // Rendering the EJS template with data
        console.log(userdata)
        res.render('customers', {
            data: userdata,         // Pass the customer data to the view
            totalPages: Math.ceil(count / limit),  // Total pages for pagination
            currentPage: page       // Current page number
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};


//block customer
const customerBlocked = async(req,res)=>{
    console.log("going to block")
    try {
        let id = req.params.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        req.session.user= null
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

// unblock customer 

const customerUnblocked = async(req,res)=>{
    try {
        let id  = req.params.id
        await User.updateMany({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked,  
};
