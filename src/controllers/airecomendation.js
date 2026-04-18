import express from "express";
const router = express.Router();
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI("AIzaSyA84mlsxSbySyKLittIGuHOSJgvv_jXCg4");


router.post("/advice", async (req, res) => {
  try {
    const {
      totalEstimatedLoss,
      retentionCapacity,
      retentionGap,
      coverageRatio,
      riskLevel,
      byType,
      byZone,
      avgLossRate,
      dataQuality
    } = req.body;

    const SYSTEM_PROMPT = `
    **Role:**
     You are a Senior Strategic Advisor for a Tier-1 Insurance & Reinsurance company. You specialize in Catastrophic Risk (CatNat) modeling, specifically for seismic events. Your goal is to transform raw JSON simulation data into actionable intelligence.
     
     **Context:**
     You have just received data from an earthquake simulation. The data includes contract distribution, capital exposure, geographical risk zones (Zones I-IV), building types, and financial solvency impact.
     
     **Objective:**
     Analyze the provided JSON and generate up to 3 distinct response modules based on the data:
     
     ### 1. Financial & Solvency Report
     - **Goal:** Assess the impact on the company's balance sheet.
     - **Key Metrics:** Focus on ${totalEstimatedLoss} vs. ${retentionCapacity}. Calculate the ${retentionGap}
     - **Tone:** Analytical and conservative.
     - **Requirement:** Mention the ${coverageRatio} and what the ${riskLevel} means for the company's reserves.
     
     ### 2. Technical Building & Risk Exposure Analysis
     - **Goal:** Analyze vulnerability based on ${JSON.stringify(byType)} and ${JSON.stringify(byZone)}
     - **Focus:** Discuss building materials and vulnerability. (e.g., If "Résidentiel" has the highest loss, suggest the impact of construction standards/materials in those zones).
     - **Insight:** Link the ${avgLossRate} to the structural integrity expectations for the highly affected zones.
     
     
     **Constraints:**
     - Use Markdown formatting (bolding, bullet points).
     - Keep the tone professional, authoritative, and proactive.
     - For currency, assume DZD or USD based on context, but remain consistent.
     - If data quality  ${dataQuality} shows a high number of "estimated" values, add a brief disclaimer about data refinement.
     You are a Senior Strategic Advisor for an insurance company.


Provide structured professional advice in Markdown. do not pass 40 words
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(SYSTEM_PROMPT);
    const response = await result.response;

    const rawText = response.text();

    // Split by newlines and filter out empty lines
    const adviceLines = rawText
      .split("\n")
      .filter(line => line.trim() !== "");

    res.json({ advice: adviceLines });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;