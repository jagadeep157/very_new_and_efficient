import exp from "express";
import {UserModel} from "../models/usersSchema.js";
import {JobModel} from "../models/jobSchema.js";
import {ApplicationModel} from "../models/applSchema.js";
import {authenticateUser,restrictTo} from "../middleware/authorizationMiddleware.js";
export const adminRoutes = exp.Router();
adminRoutes.use(authenticateUser, restrictTo("admin"));
// View all users
adminRoutes.get("/users",async(req, res)=>{
  const allUsers=await UserModel.find().select("-password");
  res.status(200).json({
    success:true,
    message:"All users",
    data:allUsers
  });
});
// View user by ID
adminRoutes.get("/users/:userId",async(req, res)=>{
  const userDetail=await UserModel
    .findById(req.params.userId)
    .select("-password");
  if (!userDetail){
    return res.status(404).json({
      success:false,
      message:"User not found"
    });
  }
  res.status(200).json({
    success:true,
    message:"User details",
    data: userDetail
  });
});
// Update user status
adminRoutes.put("/users/:userId/status",async(req, res)=>{
  const {status:newStatus}=req.body;
  if (!["active","blocked"].includes(newStatus)){
    return res.status(400).json({
      success:false,
      message:"Invalid user status"
    });
  }
  const modifiedUser=await UserModel
    .findByIdAndUpdate(
      req.params.userId,
      {$set:{status:newStatus}},
      {
        new:true,
        runValidators:true
      }
    )
    .select("-password");
  if (!modifiedUser){
    return res.status(404).json({
      success:false,
      message:"User not found"
    });
  }
  res.status(200).json({
    success:true,
    message:"User status updated",
    data:modifiedUser
  });
});

// Delete user
adminRoutes.delete("/users/:userId",async(req, res) => {
  const removedUser=await UserModel.findByIdAndDelete(
    req.params.userId
  );
  if (!removedUser) {
    return res.status(404).json({
      success:false,
      message:"User not found"
    });
  }
  // Delete jobs posted by the user
  await JobModel.deleteMany({
    employer:req.params.userId
  });
  // Delete applications submitted by the user
  await ApplicationModel.deleteMany({
    jobSeeker:req.params.userId
  });
  res.status(200).json({
    success:true,
    message:"User deleted"
  });
});
// View all jobs
adminRoutes.get("/jobs",async(req, res)=>{
  const allJobs=await JobModel
    .find()
    .populate("employer","name email");
  res.status(200).json({
    success:true,
    message:"All jobs",
    data: allJobs
  });
});

// View job by ID
adminRoutes.get("/jobs/:jobId",async(req, res)=>{
  const jobDetail=await JobModel
    .findById(req.params.jobId)
    .populate("employer", "name email");
  if (!jobDetail){
    return res.status(404).json({
      success:false,
      message:"Job not found"
    });
  }
  res.status(200).json({
    success:true,
    message:"Job details",
    data:jobDetail
  });
});

// Remove inappropriate job
adminRoutes.delete("/jobs/:jobId",async(req, res)=>{
  const removedJob=await JobModel.findByIdAndDelete(
    req.params.jobId
  );
  if (!removedJob){
    return res.status(404).json({
      success: false,
      message: "Job not found"
    });
  }
  // Delete applications related to the deleted job
  await ApplicationModel.deleteMany({
    job:req.params.jobId
  });
  res.status(200).json({
    success:true,
    message:"Job removed by admin"
  });
});

// Platform data summary
adminRoutes.get("/summary",async(req, res)=>{
  const userCount=await UserModel.countDocuments();
  const jobCount=await JobModel.countDocuments();
  const applicationCount=await ApplicationModel.countDocuments();
  res.status(200).json({
    success:true,
    message:"Platform summary",
    data:{
      totalUsers:userCount,
      totalJobs:jobCount,
      totalApplications:applicationCount
    }
  });
});
