const express = require('express');
const dotenv = require('dotenv');
const { Groq } = require('groq-sdk');

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/flashcards', async (req, res) => {
  const { notes, count, image, mimeType, gradeLevel, academicStrand } = req.body;

  try {
    let systemInstructions = "You are an expert academic reviewer. Generate exactly " + (count || 10) + " structured study flashcards.\n" +
                             "Target Level: " + (gradeLevel || 'Senior High School') + "\n" +
                             "Target Track/Strand: " + (academicStrand || 'General') + "\n\n" +
                             "CRITICAL FORMAT RULES:\n" +
                             "1. Half of the cards must be Multiple Choice questions. Format the \"question\" string to include options A, B, C, and D separated by line breaks (e.g. \"Question...\\nA. Option\\nB. Option...\") and make the \"answer\" property just the correct option string (e.g. \"A. Option\").\n" +
                             "2. The other half of the cards must be Identification questions, where the \"question\" property provides a clear definition and the \"answer\" property is the exact term.\n\n" +
                             "You must respond with a pure, raw JSON object containing a single top-level array property called \"cards\".\n" +
                             "Each item in the array must be an object containing exactly two string properties: \"question\" and \"answer\".\n" +
                             "Do not enclose your output in markdown code blocks like ```json. Return only valid, minified raw JSON text.";

    const messages = [
      { role: "system", content: systemInstructions }
    ];

    if (image && mimeType) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Analyze this study note image along with any text inputs provided: " + (notes || "") },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}` } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: "Here is the raw text study material: " + (notes || "Generate default relevant track items.")
      });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "qwen/qwen3.8-27b",
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    if (!chatCompletion.choices || chatCompletion.choices.length === 0) {
      throw new Error("No choices returned from Groq API.");
    }
    
    // FIXED: Added [0] index accessor to unpack Groq choices object array natively
    const firstChoice = chatCompletion.choices[0];
    const rawResponseText = firstChoice.message ? firstChoice.message.content : null;
    
    if (!rawResponseText) {
      throw new Error("Response content is empty or undefined.");
    }

    const parsedData = JSON.parse(rawResponseText.trim());
    res.json(parsedData);

  } catch (error) {
    console.error("Groq Backend Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to process flashcard data via Groq." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
