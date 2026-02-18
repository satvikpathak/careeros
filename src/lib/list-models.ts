import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in environment");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  console.log("--- Listing Models (Default) ---");
  try {
    // Note: listModels doesn't take an apiVersion in the same way, 
    // it depends on how the client is initialized, or you can use the REST API.
    // In the SDK, it usually uses v1beta for listModels.
    const models = await genAI.listModels();
    for (const model of models.models) {
      console.log(`Name: ${model.name}, Methods: ${model.supportedGenerationMethods.join(", ")}`);
    }
  } catch (error) {
    console.error("Failed to list models:");
    console.error(error);
  }
}

listModels();
