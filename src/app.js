import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiReponse.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { runMedicalResearchAssistant } from "./services/research/assistant.js";



const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(cors({
  origin : "*",
}))


app.use("/api/chat", async(req, res)=> {
  const {patientName, disease, location, message} = req.body
  const response = await runMedicalResearchAssistant(patientName,disease,intent,location,message);
  res.json(
    new ApiResponse(200, response, "success True")
  )
  
});

export {app};
