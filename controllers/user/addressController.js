const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require('../../models/addressSchema')
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");



// get address 
const getAddresses = async (req, res) => {
    const userId = req.session.user;
    console.log(req.session.user)
    const userdata = await User.findOne({ _id: userId});
    const addressData = await Address.findOne({userId:userId})
    try {
        res.render("user-address", {
            user: userdata,
            addresses:addressData?.address || []
      });
    } catch (error) {
        console.log(error)
    }
  };

  const getAddressesOfUser = async (req, res) => {
    const userId = req.session.user;
    const {addressId} = req.params
    const addressData = await Address.findOne({userId})
    console.log(addressData)
    res.json({
      addressData : {
        ...addressData,
        address : addressData.address.filter(add => add._id == addressId)
      }
    })
  };



  const getAddressOfUser = async (req, res) => {
    const userId = req.session.user;
    const {addressId}  = req.params
    
    try {
        const addressData = await Address.findOne({userId,'address._id': addressId})
        console.log(addressData)
        res.json({addressData})
    } catch (error) {
        console.log(error)
    }
    
  };


  // add addressses
  const addAddresses = async (req, res) => {
    console.log("Add Address function");    
    const userId = req.session.user; // Fetching the logged-in user ID from the session.
  
    try {
      // Destructuring data from the request body
      const { fullName, streetAddress, city, state, pinCode, phone, altPhone, landmark } = req.body;
  
      // Check if the user exists and is not blocked
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found or blocked." });
      }
  
      // Find the address document for the user, or create a new one if it doesn't exist
      const addressDoc = await Address.findOne({ userId });
      const newAddress = {
        user: userId,
        name: fullName,
        city,
        landmark,
        streetAddress,
        state,
        pincode: pinCode,
        phone,
        altphone: altPhone,
      };
  
      if (addressDoc) {
        // Add new address to the existing user's address array
        addressDoc.address.push(newAddress);
        await addressDoc.save();
        return res.status(201).json({ message: "Address added successfully." ,addressId:addressDoc.address[addressDoc.address.length-1]._id});
      } else {
        // Create a new address document for the user
        const newAddressDoc = new Address({
          userId,
          address: [newAddress],
        });
        await newAddressDoc.save();
        return res.status(201).json({ message: "Address added successfully." ,addressId:newAddressDoc.address[newAddressDoc.address.length-1]._id});
      }
     
     
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error adding address", error });
    }
  };

  // edit address 
  const editAddress = async(req,res)=>{
    const userId = req.session.user
    const {addressId} = req.params
    const { fullName, streetAddress, city, state, pinCode, phone, altPhone, landmark } = req.body; // Address details from request body
    try {
      const updateDoc = await Address.findOneAndUpdate(
        { userId, "address._id": addressId }, // Match user and address
        {
            $set: {
                "address.$.name": fullName,
                "address.$.streetAddress": streetAddress,
                "address.$.city": city,
                "address.$.state": state,
                "address.$.pincode": pinCode,
                "address.$.phone": phone,
                "address.$.altphone": altPhone,
                "address.$.landmark": landmark,
            },
        },
        { new: true } // Return the updated document
    );

    if(!updateDoc){
      return res.status(404).json({message:"address not found "})
    }else{
      return res.status(200).json({message:"Address updated successfully"})
    }
   
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating address.", error });
    } 
  }

  // delete addresss 
  const deleteAddress = async( req,res)=>{
    const userId = req.session.user 
    const  {addressId} = req.params
    try {
      const deleteDoc = await Address.findOneAndUpdate({userId},{$pull:{address:{_id:addressId}}},{new:true})

      if(!deleteDoc){
        return res.status(404).json({message:"address not found "})
      }
      return res.status(200).json({message:"message deleted successfully"})
    } catch (error) {
      res.status(500).json({ message: "Error deleting address.", error });
    }
  }






  module.exports = {
    getAddresses,
    addAddresses ,
    getAddressOfUser,
    editAddress ,
    deleteAddress,
    getAddressesOfUser
  }