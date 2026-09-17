import exp from"express";
import{JobModel}from"../models/jobSchema.js";
import{ApplicationModel}from"../models/applSchema.js";
import{authenticateUser,restrictTo}from"../middleware/authorizationMiddleware.js";
export const applicationRoutes=exp.Router();
// Job Seeker applies for a job
applicationRoutes.post("/applications",authenticateUser,restrictTo("jobseeker"),async(req,res)=>{
  let{jobId,resume,coverLetter}=req.body;
  if(!jobId){
    return res.status(400).json({success:false,message:"jobId is required"});
  }
  let matchedJob=await JobModel.findOne({_id:jobId,status:"open"});
  if(!matchedJob){
    return res.status(404).json({success:false,message:"Open job not found"});
  }
  if(new Date(matchedJob.applicationDeadline)<new Date()){
    return res.status(400).json({success:false,message:"Application deadline has passed"});
  }
  let priorApplication=await ApplicationModel.findOne({
    job:jobId,
    jobSeeker:req.user._id
  });
  if(priorApplication){
    return res.status(409).json({success:false,message:"You already applied for this job"});
  }
  let newApplication=await ApplicationModel.create({
    job:jobId,
    jobSeeker:req.user._id,
    resume,
    coverLetter
  });
  res.status(201).json({
    success:true,
    message:"Application submitted",
    data:newApplication
  });
});
// Job Seeker views own applications
applicationRoutes.get("/my-applications",authenticateUser,restrictTo("jobseeker"),async(req,res)=>{
  let applicationList=await ApplicationModel.find({jobSeeker:req.user._id})
    .populate("job","title companyName location employmentType status applicationDeadline")
    .populate("jobSeeker","name email");

  res.status(200).json({
    success:true,
    message:"Your applications",
    data:applicationList
  });
});
// Job Seeker views status of one own application
applicationRoutes.get("/my-applications/:applicationId",authenticateUser,restrictTo("jobseeker"),async(req,res)=>{
  let applicationRecord=await ApplicationModel.findOne({
    _id:req.params.applicationId,
    jobSeeker:req.user._id
  }).populate("job","title companyName status");

  if(!applicationRecord){
    return res.status(404).json({success:false,message:"Application not found"});
  }
  res.status(200).json({
    success:true,
    message:"Application status",
    data:applicationRecord
  });
});
// Employer views applications for own jobs
applicationRoutes.get("/employer-applications",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let employerJobs=await JobModel.find({employer:req.user._id}).select("_id");
  let employerJobIds=employerJobs.map(jobItem=>jobItem._id);

  let applicationList=await ApplicationModel.find({job:{$in:employerJobIds}})
    .populate("job","title companyName")
    .populate("jobSeeker","name email skills experience education");

  res.status(200).json({
    success:true,
    message:"Applications received",
    data:applicationList
  });
});
// Employer updates application status for an application belonging to their job
applicationRoutes.put("/applications/:applicationId/status",authenticateUser,restrictTo("employer"),async(req,res)=>{
  let{status}=req.body;
  let validStatuses=["submitted","reviewing","shortlisted","rejected","hired"];

  if(!validStatuses.includes(status)){
    return res.status(400).json({success:false,message:"Invalid application status"});
  }
  let applicationRecord=await ApplicationModel.findById(req.params.applicationId).populate("job","employer");
  if(!applicationRecord){
    return res.status(404).json({success:false,message:"Application not found"});
  }
  if(applicationRecord.job.employer.toString()!==req.user._id.toString()){
    return res.status(403).json({success:false,message:"You can manage only applications for your jobs"});
  }
  applicationRecord.status=status;
  await applicationRecord.save();
  res.status(200).json({
    success:true,
    message:"Application status updated",
    data:applicationRecord
  });
});
