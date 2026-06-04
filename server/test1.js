const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const pdfPath = "./sample.pdf";

    const pdfPart = {
      inlineData: {
        data: fs.readFileSync(pdfPath).toString("base64"),
        mimeType: "application/pdf",
      },
    };

    const prompt = `
You are an insurance claim document extraction system.

Analyze the attached medical document.

Extract the following information and return ONLY valid JSON.

{
  "patient_name": "",
  "patient_age": "",
  "patient_gender": "",
  "doctor_name": "",
  "doctor_registration_number": "",
  "hospital_name": "",
  "diagnosis": "",
  "medicines": [],
  "treatment_date": "",
  "claim_amount": 0,
  "consultation_fee": 0,
  "diagnostic_charges": 0
}

Rules:
- Return only JSON.
- Do not include markdown.
- If a field is missing, use null.
- Medicines must be returned as an array.
- claim_amount should contain the total bill amount.
`;

    const result = await model.generateContent([
      prompt,
      pdfPart,
    ]);

    console.log(result.response.text());

  } catch (error) {
    console.error(error);
  }
}

main();