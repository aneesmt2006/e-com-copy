const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalpages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      currentpage: page,
      totalpages: totalpages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/admin/pageerror");
  }
};

//add category
const addCategory = async (req, res) => {
  // const { name, description } = req.body;
  const name = req.body.name.trim();
  const description = req.body.description.trim();
  try {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }, // Case-insensitive match
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exist " });
    }

    const newCategory = new Category({
      name,
      description,
    });

    await newCategory.save();
    return res.json({ message: "category added succesfully" });
  } catch (error) {
    return res.statu(500).json({ error: "Internal servet error" });
  }
};

//add categoryOffer

const   addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const products = await Category.find({ category: category._id });
    const hasProductOffer = products.some(
      (product) => product.productOffer > percentage
    );
    if (hasProductOffer) {
      return res.json({
        status: false,
        message: "Products within this category already have",
      });
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } }
    );

    for (const product of products) {
      product.productOffer = 0;
      product.salePrice = product.regularPrice;
      await product.save();
    }

    res.json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal sever error" });
  }
};

// remove category offer

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const percentage = category.categoryOffer;
    const products = await Product.find({ category: category._id });

    if (products.length > 0) {
      for (const product of products) {
        product.salePrice += Math.floor(
          product.regularPrice * (percentage / 100)
        );
        product.productOffer = 0;
        await product.save();
      }
    }
    category.categoryOffer = 0;
    await category.save();
    res.json({ status: true });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ status: false, message: "internal Server error", error });
  }
};
// functin for list category
const getListCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

// function for unlist category

const getUnlistCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

// functin for edit category
const getEditCategory = async (req, res) => {
  try {
    console.log("from get edit category");
    const id = req.query.id;
    const category = await Category.findById({ _id: id });
    console.log(id);
    res.render("edit-category", { category: category });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

// edit category

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;
    console.log("hiiii");

    // Check for existing category with the same name
    const existingCategory = await Category.findOne({
      name: categoryName,
      _id: { $ne: id },
    });
    if (existingCategory) {
      // Send error response for duplicate category
      return res
        .status(400)
        .json({ error: "Category exists, please choose another name" });
    }

    // Update the category
    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryName,
        description: description,
      },
      { new: true }
    );

    if (updateCategory) {
      // Send success response
      return res.json({
        success: true,
        message: "Category updated successfully",
      });
    } else {
      // Handle category not found
      return res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    // Handle internal server errors
    return res.status(500).json({ error: "Internal server error" });
  }
};

// const editCategory = async (req,res)=>{
//     try {
//         console.log("from pure edit category")
//         const id = req.params.id ;
//         const {categoryName,description} = req.body
//         const existingCategory = await Category.findOne({name:categoryName})

//         if(existingCategory){
//             return res.status(400).json({error:"Category exists , please choose another name"})
//         }

//         const updateCategory = await  Category.findByIdAndUpdate(id,{
//             name:categoryName,
//             description:description,
//         },{new:true})// return document immediately

//         if(updateCategory){
//             res.redirect("/admin/category")
//         }else{
//             res.status(404).json({error:"Category not found"})
//         }

//     } catch (error) {
//         res.status(500).json({error:"Internal sever Error"})

//     }
// }

module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
};
