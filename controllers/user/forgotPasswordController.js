const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const mongoose = require('mongoose');



function generateOtp() {
    return Math.floor(3000 + Math.random() * 900).toString();
  }


  //function for sendvaerificaationemail(function to create a Transporter who will send the mail )

  async function sendVerificationEmail(email, otp) {
    try {
      const mailTransporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        auth: {
          user: "aneesanu2006@gmail.com",
          pass: process.env.NODEMAILER_PASSWORD,
        },
      });
  
      const mailDetails = {
        from: "aneesanu2006@gmail.com",
        to: email,
        subject: "VERIFY YOUR ACCOUNT",
        text: `YOUR OTP IS ${otp}`,
        html: `<b>YOUR OTP IS ${otp}</b>`,
      };
  
      const info = await mailTransporter.sendMail(mailDetails);
  
      return info.accepted.length > 0;
    } catch (error) {
      console.error("Error sending email", error);
      return false;
    }
  }














const getForgotPassPage = async(req,res)=>{
    try {
      console.log(" msg from backend getforgot page ")
        res.render('forgot-password')
    } catch (error) {
        console.log("errror from forgot page",error)
    }
}

const forgotEmailValid  = async( req,res)=>{
   try {
    const {email} = req.body
    console.log('fg email:',email)

    const isEmail = await User.findOne({email})
    if(!isEmail){
       return  res.status(404).json({error:"Email not found.."})
    }


    const otp = generateOtp();
    console.log(otp);
    const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes

    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
        return res.status(400).json({ error: " sending email-error" });
      }


    req.session.userotp = otp;
    req.session.expire = otpExpiration;
    req.session.email = email
    const start = true;
    res.status(200).json({ start, message: 'OTP sent successfully!' });
   } catch (error) {
    
   }
}


const getForgotVerifyOtp = async(req,res)=>{
    try {
        const start = true;
        res.render("forgot-verifyOtp", { start });
    } catch (error) {
        
    }
}



const forgotVerifyOTP = async (req, res) => {
    try {
      const { otp } = req.body;
  
      if (!req.session.userotp || !req.session.expire) {
        return res.status(400).json({
          success: false,
          message: "Session expired. Please resend OTP.",
        });
      }
  
      const currentTime = Date.now();
  
      if (currentTime > req.session.expire) {
        return res
          .status(400)
          .json({ success: false, message: "OTP has expired. Please resend." });
      }
  
      if (otp === req.session.userotp) {
        // const user = req.session.userdata;
        // const passwordHash = await securePassword(user.password);
        return res.json({ success: true, redirectUrl: "/forgotConfirmPswrd" });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid OTP. Please try again." });
      }
    } catch (error) {
      console.error("Error forgot verifying OTP", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred during OTP verification.",
      });
    }
  };



  const getConfirmPswrdPage  = async(req,res)=>{
    try {
      res.render('forgot-confirm-pswrd')
    } catch (error) {
      console.log("error form confirm pswrd page:",error)
    }
  }



  const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error(error);
        throw new Error("Error hashing password");
    }
};

  const passwordConfirmation = async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: "Password is required." });
    }

    try {
        const email = req.session.email;
        console.log('Backend session email:', email);

        const userdata = await User.findOne({ email });
        if (!userdata) {
            return res.status(404).json({ message: "User not found." });
        }

        // Hash the new password
        const newPassword = await securePassword(password);

        // Update the user's password
        await User.updateOne({ email }, { $set: { password: newPassword } });

        return res.status(200).json({ message: 'Password reset successfully!' });
    } catch (error) {
        console.error('Error from password confirmation:', error);
        return res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};




















  const resendOtp = async (req, res) => {
    try {
      console.log("from forgot resend otp contorller")
      const user = req.session.userdata;
      const email = req.session.email
  
      // if (!user) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Session expired. Please signup again.",
      //   });
      // }
  
      const otp = generateOtp();
      console.log(otp);
      const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes
  
      const emailSent = await sendVerificationEmail(email, otp);
  
      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to resend OTP. Try again later.",
        });
      }
  
      req.session.userotp = otp;
      req.session.expire = otpExpiration;
  
      return res.json({ success: true });
    } catch (error) {
      console.error("Resend OTP error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while resending OTP.",
      });
    }
  };




module.exports ={
     getForgotPassPage,
     forgotEmailValid,
     getForgotVerifyOtp,
     forgotVerifyOTP,
     getConfirmPswrdPage ,
     passwordConfirmation,
     resendOtp,
}