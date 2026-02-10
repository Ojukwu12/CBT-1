const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../config/env');
const { validateQuestions } = require('./questionValidation');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const getCandidateModels = () => {
  const models = [
    env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-1.0-pro',
  ];

  return Array.from(new Set(models.filter(Boolean)));
};

const getCandidateApiVersions = () => {
  const versions = [env.GEMINI_API_VERSION, 'v1beta', 'v1'];
  return Array.from(new Set(versions.filter(Boolean)));
};

const isModelNotFoundError = (err) => {
  const message = err?.message || '';
  return message.includes('not found') && message.includes('models/');
};

const generateQuestionsWithGemini = async (materialContent, courseCode, topicName, difficulty = 'mixed') => {
  const models = getCandidateModels();
  const apiVersions = getCandidateApiVersions();

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

  let lastError = null;

  for (const apiVersion of apiVersions) {
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel(
          { model: modelName },
          { apiVersion }
        );

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid response format from Gemini');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const questions = parsed.questions || [];
        validateQuestions(questions);
        return questions;
      } catch (err) {
        lastError = err;
        if (isModelNotFoundError(err)) {
          continue;
        }
        throw err;
      }
    }
  }

  throw lastError || new Error('No compatible Gemini model found');
};

module.exports = {
  generateQuestionsWithGemini,
};
