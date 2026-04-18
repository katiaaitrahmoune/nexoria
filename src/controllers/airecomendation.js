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
You are a Senior Strategic Advisor for an insurance company.

### Financial Analysis
- Total Loss: ${totalEstimatedLoss}
- Retention Capacity: ${retentionCapacity}
- Gap: ${retentionGap}
- Coverage Ratio: ${coverageRatio}
- Risk Level: ${riskLevel}

### Risk Exposure
- By Type: ${JSON.stringify(byType)}
- By Zone: ${JSON.stringify(byZone)}
- Avg Loss Rate: ${avgLossRate}

### Data Quality
- ${dataQuality}

Provide structured professional advice in Markdown. do not pass 6 ligns
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(SYSTEM_PROMPT);
    const response = await result.response;

    res.json({ advice: response.text() });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
