const mongoose = require("mongoose");

const env = require("dotenv").config();

// const connectDB = async () =>{
//     try{
//         const res = await mongoose.connect(process.env.MONGODB_URI)
//         console.log("database connected successfully")
//     }
//     catch(err){
//         console.log("DB connection error",err.message)
//         process.exit(1)
//     }
// }

const conectdb = async () => {
  // console.log("process.env.MONGODB_URI");
  try {
    await mongoose.connect('mongodb+srv://aneesanu2006:aneesanu@cluster0.nuojf.mongodb.net/cust');
    console.log("database connected succesfully");
  } catch (error) {
    console.error("db connection error", error.message);
    process.exit(1);
  }
};

module.exports = conectdb;
