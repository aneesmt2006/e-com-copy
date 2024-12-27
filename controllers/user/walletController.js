const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const { ConstantColorFactor } = require("three");
const { default: mongoose } = require("mongoose");




const getWallet = async (req, res) => {
    const userId = req.session.user; // Assuming user session contains user ID
    try {
        const userData = await User.findOne({ _id: userId });
        let walletData = await Wallet.findOne({ userId });
        console.log('wallet------------',walletData)

        if (!walletData) {
            // Create a wallet for the user if it doesn't exist
            const newWallet = new Wallet({ userId, balance: 0, transactions: [] });
            await newWallet.save();
            walletData = newWallet;
        }

        res.render('wallet', {
            user: userData,
            wallet: walletData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching wallet data');
    }
};


const addWallet = async(req,res)=>{
    const userId = req.session.user
    const {amount} = req.body

    if(amount > 10000){
        return res.status(400).json({ message: "Amount must be less than 10000." });
    }
    try {
        let wallet = await Wallet.findOne({userId});
        if (!wallet) {
            // If no wallet exists, create one
            wallet = new Wallet({ userId, balance: amount, transactions: [] });
          } else {
            // Update wallet balance
            wallet.balance += amount;
          }

          wallet.transactions.push({ amount, type: "credit" });

          await wallet.save();
          res.status(200).json({ message: "Funds added successfully", wallet });

    } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
    }
}

module.exports ={
    getWallet,
    addWallet,
}