import jwt from"jsonwebtoken";
import{UserModel}from"../models/usersSchema.js";
export async function authenticateUser(req,res,next){
  try{
    let authToken=req.cookies.token;
    if(!authToken){
      return res.status(401).json({success:false,message:"Login required"});
    }
    let decodedToken=jwt.verify(authToken,process.env.JWT_SECRET);
    let currentUser=await UserModel.findById(decodedToken.userId);
    if(!currentUser){
      return res.status(401).json({success:false,message:"User not found"});
    }
    if(currentUser.status!=="active"){
      return res.status(403).json({success:false,message:"User account is blocked"});
    }
    req.user=currentUser;
    next();
  }catch(err){
    return res.status(401).json({success:false,message:"Invalid or expired token"});
  }
}
export function restrictTo(...allowedRoles){
  return(req,res,next)=>{
    if(!allowedRoles.includes(req.user.role)){
      return res.status(403).json({success:false,message:"Access denied"});
    }
    next();
  };
}
