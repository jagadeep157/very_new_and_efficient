import exp from"express";
import bcrypt from"bcryptjs";
import jwt from"jsonwebtoken";
import{UserModel}from"../models/usersSchema.js";
import{authenticateUser,restrictTo}from"../middleware/authorizationMiddleware.js";
export const userRoutes=exp.Router();
// Register as Job Seeker or Employer
userRoutes.post("/register",async(req,res)=>{
  let{name,email,password,role,skills,experience,education}=req.body;
  if(!name||!email||!password){
    return res.status(400).json({success:false,message:"name, email and password are required"});
  }
  if(role==="admin"){
    return res.status(403).json({success:false,message:"Admin registration is not allowed"});
  }
  role=role||"jobseeker";
  let foundUser=await UserModel.findOne({email});
  if(foundUser){
    return res.status(409).json({success:false,message:"Email already registered"});
  }
  let encryptedPassword=await bcrypt.hash(password,10);
  let createdUser=await UserModel.create({
    name,
    email,
    password:encryptedPassword,
    role,
    skills:skills||[],
    experience:experience||0,
    education:education||[]
  });
  let sanitizedUser=createdUser.toObject();
  delete sanitizedUser.password;
  res.status(201).json({
    success:true,
    message:"User registered",
    data:sanitizedUser
  });
});
// Login
userRoutes.post("/login",async(req,res)=>{
  let{email,password}=req.body;
  let matchedUser=await UserModel.findOne({email}).select("+password");
  if(!matchedUser){
    return res.status(401).json({success:false,message:"Invalid email or password"});
  }
  if(matchedUser.status!=="active"){
    return res.status(403).json({success:false,message:"User account is blocked"});
  }
  let isPasswordValid=await bcrypt.compare(password,matchedUser.password);
  if(!isPasswordValid){
    return res.status(401).json({success:false,message:"Invalid email or password"});
  }
  let authToken=jwt.sign(
    {userId:matchedUser._id,role:matchedUser.role},
    process.env.JWT_SECRET,
    {expiresIn:process.env.JWT_EXPIRES_IN||"1d"}
  );
  res.cookie("token",authToken,{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    maxAge:24*60*60*1000
  });
  let sanitizedUser=matchedUser.toObject();
  delete sanitizedUser.password;
  res.status(200).json({
    success:true,
    message:"Login successful",
    data:sanitizedUser
  });
});
// View own profile
userRoutes.get("/profile",authenticateUser,async(req,res)=>{
  res.status(200).json({
    success:true,
    message:"Profile details",
    data:req.user
  });
});
// Update own profile
userRoutes.put("/profile",authenticateUser,async(req,res)=>{
  let profileUpdates=req.body;
  delete profileUpdates.password;
  delete profileUpdates.role;
  delete profileUpdates.status;
  delete profileUpdates.email;
  let updatedProfile=await UserModel.findByIdAndUpdate(
    req.user._id,
    {$set:{...profileUpdates}},
    {new:true,runValidators:true}
  );
  res.status(200).json({
    success:true,
    message:"Profile modified",
    data:updatedProfile
  });
});
// Logout
userRoutes.post("/logout",authenticateUser,async(req,res)=>{
  res.clearCookie("token");

  res.status(200).json({
    success:true,
    message:"Logout successful"
  });
});
// Protected route accessible only to authenticated Job Seekers
userRoutes.get("/jobseeker-only",authenticateUser,restrictTo("jobseeker"),(req,res)=>{
  res.json({
    success:true,
    message:"Job Seeker protected route"
  });
});
