
const User  = require("../models/userSchema")


const userAuth = async (req, res, next) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ redirect: '/signup' });
      }
      return res.redirect('/signup');
    }

    const user = await User.findById(userId);

    if (!user) {
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ redirect: '/signup' });
      }
      return res.redirect('/signup');
    }

    if (user.isBlocked) {
      req.flash('error_msg', 'Your account has been blocked');
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ redirect: '/signup', message: 'Your account has been blocked' });
      }
      return res.redirect('/signup');
    }

    next();
  } catch (error) {
    console.error('Error in user authentication:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.status(500).send('Internal server error (in auth)');
  }
};

// const userAuth = async(req,res,next)=>{
//     try {
//         const userId = req.session.user;
    
//         if (!userId) {
//           return res.redirect('/signup');
//         }
    
//         const user = await User.findById(userId);
    
//         if (!user) {
//           req.session.destroy((err) => {
//             if (err) console.error('Error destroying session:', err);
//           });
//           return res.redirect('/signup');
//         }
    
//         if (user.isBlocked) {
//           req.flash('error_msg', 'Your account has been blocked');
//           return res.redirect('/signup');
//         }
    
//         next();
//       } catch (error) {
//         console.error('Error in user authentication:', error);
//         res.status(500).send('Internal server error (in auth)');
//       }
// }

const adminAuth = (req,res,next)=>{

    if(req.session.admin){
        next()
    }else{
        res.redirect('/admin')
    }
    // User.findOne({isAdmin:true})
    // .then((data)=>{
    //     if(data){
    //         next()
    //     }else{
    //         res.redirect('/admin/adminlogin')
    //     }
    // }).catch((error)=>{
    //     console.log("error in admin auth middleware",error)
    //     res.status(500).send("Internal server error")
    // })
}

module.exports = {
    adminAuth,
    userAuth
}