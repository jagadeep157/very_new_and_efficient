import exp from"express";
import{JobModel}from"../models/jobSchema.js";
import{ApplicationModel}from"../models/applSchema.js";
import{authenticateUser,restrictTo}from"../middleware/authorizationMiddleware.js";
export const jobRoutes=exp.Router();
// View all available jobs - public
jobRoutes.get("/jobs",async(req,res)=>{
  let jobList=await JobModel.find({status:"open"}).populate("employer","name email");
  res.status(200).json({success:true,message:"Available jobs",data:jobList});
});
// View a single job - public
jobRoutes.get("/jobs/:jobId",async(req,res)=>{
  let jobRecord=await JobModel.findById(req.params.jobId).populate("employer","name email");
  if(!jobRecord)return res.status(404).json({success:false,message:"Job not found"});
  res.status(200).json({success:true,message:"Job details",data:jobRecord});
});
// Employer creates job
jobRoutes.post("/jobs",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let jobData=req.body;
  if(!jobData.title||!jobData.companyName||!jobData.description||!jobData.location||!jobData.employmentType||jobData.salaryMin===undefined||jobData.salaryMax===undefined||jobData.experienceRequirement===undefined||!jobData.applicationDeadline){
    return res.status(400).json({success:false,message:"Required job fields are missing"});
  }
  let createdJob=await JobModel.create({...jobData,employer:req.user._id});
  res.status(201).json({success:true,message:"Job created",data:createdJob});
});
// Employer views own jobs
jobRoutes.get("/my-jobs",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let jobList=await JobModel.find({employer:req.user._id});
  res.status(200).json({success:true,message:"Your jobs",data:jobList});
});
// Employer views a specific own job
jobRoutes.get("/my-jobs/:jobId",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let jobRecord=await JobModel.findOne({_id:req.params.jobId,employer:req.user._id});
  if(!jobRecord)return res.status(404).json({success:false,message:"Job not found or not owned by you"});
  res.status(200).json({success:true,message:"Job details",data:jobRecord});
});
// Employer updates own job
jobRoutes.put("/jobs/:jobId",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let jobRecord=await JobModel.findOne({_id:req.params.jobId,employer:req.user._id});
  if(!jobRecord)return res.status(404).json({success:false,message:"Job not found or not owned by you"});
  let updateData=req.body;
  delete updateData.employer;
  let updatedJob=await JobModel.findByIdAndUpdate(
    req.params.jobId,
    {$set:{...updateData}},
    {new:true,runValidators:true}
  );
  res.status(200).json({success:true,message:"Job modified",data:updatedJob});
});
// Employer deletes own job
jobRoutes.delete("/jobs/:jobId",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let jobRecord=await JobModel.findOne({_id:req.params.jobId,employer:req.user._id});
  if(!jobRecord)return res.status(404).json({success:false,message:"Job not found or not owned by you"});
  await ApplicationModel.deleteMany({job:req.params.jobId});
  await JobModel.findByIdAndDelete(req.params.jobId);
  res.status(200).json({success:true,message:"Job deleted"});
});
