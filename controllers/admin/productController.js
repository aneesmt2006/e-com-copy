const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const storage = require("../../helpers/multer");
const sharp = require("sharp");
const uploads = multer({ storage });

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true }); //finding the all listed category from database
    console.log("from getPRoduct page ");
    res.render("product-add", {
      cat: category,
    });
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.log("internal sever error", error);
  }
};

//add products 
const addProducts = async (req, res) => {
  console.log("from addproducts");
  try {
    const Products = req.body;
    console.log(Products)
    console.log('going to check if it exist')
    const ProductExists = await Product.findOne({
      productName: Products.name,
    });
    console.log(ProductExists,'it is')

    if (!ProductExists) {
      const images = [];
      console.log(req.files);
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;

          const resizedImagePath = path.join(
            "public",
            "uploads",
            "re-image",
            req.files[i].filename
          );

          
          images.push(req.files[i].filename);
        }
      }
      console.log(images);
      const categoryId = await Category.findOne({ name: Products.category });
      if (!categoryId) {
        return res.status(400).join("Invalid category name ");
      }

      console.log(req.body)


      const sizes = {
        S: parseInt(Products['size-s']) || 0,
        M: parseInt(Products['size-m']) || 0,
        L: parseInt(Products['size-l']) || 0,
        XL: parseInt(Products['size-xl']) || 0,
        XXL: parseInt(Products['size-xxl']) || 0
      };

      const newProduct = new Product({
        productName: Products.name,
        description: Products.description,
        category: categoryId._id,
        regularPrice: Products.regularPrice,
        salePrice: Products.salePrice,
        createdOn: new Date(),
        sizes:sizes,
        color: Products.color,
        wash:Products.wash,
        material:Products.material,
        fit:Products.fit,
        productImage: images,
        status: "Available",
      });

    

      await newProduct.save();
      console.log("saved databse");
      return res.json({ success: true, redirectUrl: "/admin/addProducts" });
    } else {
      return res.status(400).json({
        message: "Product alaready exist , pls try again with another ",
      });
    }
  } catch (error) {
    console.error("Error saving product", error);
    return res
      .status(500)
      .json({ success: false, message: "an error occured while add product " });
  }
};

//products listing page
const getallProducts = async (req, res) => {
   console.log("from product listing page")
  try {
    const { page = 1, limit = 5, search = "", status } = req.query;
     // Set up the query object based on search and status
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" }; // Case-insensitive search by name
        }
        if (status) {
            query.status = status; // Filter by status (e.g., Active or Inactive)
        }

        // Fetch products with pagination and the constructed query
        const productData = await Product.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate("category")
            .exec();

            // total  quantity of each prouduct
            productData.forEach(product => {
              const { S, M, L, XL, XXL } = product.sizes;
              product.totalQuantity = S + M + L + XL + XXL;
          });
        // Count total matching products for pagination calculation
        const count = await Product.countDocuments(query);

        // Fetch categories (if necessary) and render the products page
        const category = await Category.find({ isListed: true });

    console.log("_________________")
    // console.log(productData)
    if(category){
        res.render('products',{
            data : productData,
            currentpage : page,
            totalpages:Math.ceil(count/limit),
            cat:category,
            
        })
    }else{
      res.render('page-404')
    }
    

    
  } catch(error) {
    console.log(error)
    res.redirect('/admin/pageerror')
  }
};

// Block products
const blockProduct = async(req,res)=>{
      try {
       const Id = req.query.id
       console.log(Id)
       const product = await Product.updateOne({_id:Id},{$set:{isBlocked:true}})
       res.redirect('/admin/products')

   
      } catch (error) {
        console.log(error)
        res.redirect('/admin/pageerror')
      }
}

//unblock Products 
const unblockProduct = async (req, res) => {
  try {
      const Id = req.query.id;

      // Update `isBlocked` status to false for unblocking
      const product = await Product.findByIdAndUpdate(Id, { isBlocked: false });
      res.redirect('/admin/products'); 

  } catch (error) {
      console.error('Error unblocking product:', error);
      res.status(500).send('Server error');
  }
};

// Edit products
const editProduct = async(req,res)=>{
  console.log("edit")
  try {
        editId = req.query.id
        const product = await Product.findOne({_id:editId}).populate('category')
        console.log('editing data-----',product)
        const category = await Category.find({})
       
       
        // console.log(product)
        // console.log(category)
        res.render('edit-product',{
          product:product,
          cat:category,
        })
       
  } catch (error) {
    console.log(error)
    res.redirect('/admin/pageerror')
  }
}

// Edit products submit 
const mongoose = require('mongoose');

const addEditProduct = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(" from productd id--------------- ", id)

    const product = await Product.findOne({ _id: id });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const data = req.body;
    console.log("requested body---------->  ",data)
    const ProductExists = await Product.findOne({
      productName: data.name,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });

    if (ProductExists) {
      console.log("Product with this same name already exists");
      return res.status(400).json({
        message: 'Product with this same name already exists. Try with another name.',
      });
    }

    const images = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    const sizes = {
      S: parseInt(data['size-s']) || 0,
      M: parseInt(data['size-m']) || 0,
      L: parseInt(data['size-l']) || 0,
      XL: parseInt(data['size-xl']) || 0,
      XXL: parseInt(data['size-xxl']) || 0,
    };

    const updateFields = {
      productName: data.name,
      description: data.description,
      salePrice: data.salePrice,
      category:data.category,
      regularPrice: data.regularPrice,
      sizes: sizes,
      wash: data.wash,
      material: data.material,
      fit: data.fit,
      status: "Available",
    };

    const category = await Category.findOne({ name: data.category });
if (!category) {
  return res.status(400).json({ message: 'Category not found' });
}
updateFields.category = category._id;

    if (images.length > 0) {
      updateFields.productImage = images;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (updatedProduct) {
      return res.redirect('/admin/products');
    } else {
      return res.status(404).send('Product not found');
    }

  } catch (error) {
    console.error("Error updating product:", error);
    res.redirect('/admin/pageerror');
  }
};

// add offer 
const updateOffer = async(req,res)=>{
  console.log("iam update offer function")
  const {productId,offer} =  req.body
  console.log(productId,offer)

  if(!productId || !offer){
    return res.status(400).json({success:false,message:"Invalid data provided"})
  }
  try {
    const result = await Product.findByIdAndUpdate(productId,{$set:{productOffer:offer}},{new:true})

    if(result){
      res.status(200).json({success:true,message:"Offer updated Successfully",result:result})
    }else {
      console.log("there is no body")
      res.status(404).json({ success: false, message: 'Product not found' });
  }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// remove offer 
const removeOffer = async(req,res)=>{
  const{productId} = req.body

  try {
    // Update the product to remove the offer
        const result = await Product.updateOne(
            { _id: productId },
            { $set: { productOffer: 0 } }
        );

        if (result.modifiedCount > 0) {
            res.json({ success: true ,result:result});
        } else {
            res.json({ success: false, message: 'No changes made.' });
        }
  } catch (error) {
    console.error('Error removing offer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getProductAddPage,
  addProducts,
  getallProducts,
  blockProduct,
  unblockProduct,
  editProduct,
  addEditProduct,
  updateOffer,
  removeOffer
};
