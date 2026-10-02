const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

// Enable CORS for development and Extension environments.
// In production, you can restrict cors origin to your specific Chrome Extension ID:
// app.use(cors({ origin: 'chrome-extension://your-extension-id' }));
app.use(cors());

// Verify OpenAI API Key is loaded
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: OPENAI_API_KEY environment variable is not defined!");
}

const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key'
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Primary optimization endpoint
app.post('/api/optimize', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid product description.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'Backend Configuration Error: OpenAI API Key is missing on the server.' 
      });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a world-class e-commerce conversion optimization engine. 
Analyze the user's raw product text and return a strict JSON object with exactly three keys: "title", "description", and "tags".

Strict Marketplace Constraints:
1. "title": High-converting, click-worthy title optimized for search discovery. MUST be strictly 140 characters or less.
2. "description": An engaging, persuasive, benefit-driven product description. Format using clean paragraphs or clear bullet points. You MUST creatively infuse highly relevant emojis throughout the text to drastically maximize visual engagement and conversions.
3. "tags": An array of exactly 10 high-intent search keywords/tags. EVERY single tag string within the array MUST be strictly 20 characters or less.

Output must be pure valid JSON matching this schema precisely. No outer markdown formatting or wrapping.`
        },
        {
          role: "user",
          content: `Optimize this listing raw text:\n\n${description}`
        }
      ],
      temperature: 0.7
    });
    
    const rawOutput = completion.choices[0].message.content;
    const structuredData = JSON.parse(rawOutput);
    
    res.json(structuredData);
  } catch (error) {
    console.error('Production API Error:', error);
    res.status(500).json({ 
      error: 'Failed to optimize assets. Please check backend proxy infrastructure logs.' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Listing Optimizer Secure Proxy active on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
