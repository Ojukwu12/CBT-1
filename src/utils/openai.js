const axios = require('axios');
const { env } = require('../config/env');
const { validateQuestions } = require('./questionValidation');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const generateQuestionsWithOpenAI = async (materialContent, courseCode, topicName, difficulty = 'mixed') => {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }

  const prompt = `You are an expert question generator for university courses in Nigeria.
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

Generate the questions now:`;

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const message = response?.data?.choices?.[0]?.message?.content || '';
  const jsonMatch = message.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from OpenAI');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const questions = parsed.questions || [];
  validateQuestions(questions);
  return questions;
};

module.exports = {
  generateQuestionsWithOpenAI,
};
