const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../config/env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const generateQuestions = async (materialContent, courseCode, topicName, difficulty = 'mixed') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
You are an expert question generator for university courses in Nigeria.
Generate exactly 10 multiple-choice questions from the following material.

Course Code: ${courseCode}
Topic: ${topicName}
Difficulty Level: ${difficulty} (easy, medium, hard - balanced if mixed)

Material Content:
${materialContent}

STRICT REQUIREMENTS:
1. Generate EXACTLY 10 questions
2. Each question must have 4 options (A, B, C, D)
3. Only ONE correct answer per question
4. Questions must be clear and unambiguous
5. No hallucinations or content not from the material
6. Difficulty distribution: If mixed, 3 easy, 4 medium, 3 hard

RESPONSE FORMAT (JSON ONLY, no markdown):
{
  "questions": [
    {
      "text": "Question text here?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correctAnswer": "A",
      "difficulty": "easy"
    }
  ]
}

Generate the questions now:
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions || [];
};

module.exports = {
  generateQuestions,
};
