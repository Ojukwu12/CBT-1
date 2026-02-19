const axios = require('axios');
const { env } = require('../config/env');
const { validateQuestions } = require('./questionValidation');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const generateQuestionsWithOpenAI = async (
  materialContent,
  courseCode,
  topicName,
  difficulty = 'mixed',
  options = {}
) => {
  const questionCount = Number.isInteger(options.questionCount) && options.questionCount > 0
    ? options.questionCount
    : 20;
  const excludedQuestionTexts = Array.isArray(options.excludedQuestionTexts)
    ? options.excludedQuestionTexts.filter(Boolean)
    : [];
  const difficultyDistribution =
    questionCount === 20
      ? '6 easy, 8 medium, 6 hard'
      : questionCount === 10
        ? '3 easy, 4 medium, 3 hard'
        : `balanced across easy, medium, hard totaling ${questionCount}`;
  const duplicateGuard = excludedQuestionTexts.length
    ? `\n\n⚠️ CRITICAL: Do NOT generate these existing or previously generated questions again (same meaning/topic/stem):\n${excludedQuestionTexts
        .map((text, index) => `${index + 1}. "${text}"`)
        .join('\n')}\n\nEvery question you generate must be SIGNIFICANTLY different from the list above—different question stems, different angles, different contexts.`
    : '\n\n✓ Generate completely original questions that have not been seen before.';

  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }

  const prompt = `You are an expert question generator for university courses in Nigeria.
Generate exactly ${questionCount} multiple-choice questions from the following material.

Course Code: ${courseCode}
Topic: ${topicName}
Difficulty Level: ${difficulty} (easy, medium, hard - balanced if mixed)

Material Content:
${materialContent}

STRICT REQUIREMENTS:
1. Generate EXACTLY ${questionCount} questions
2. Each question must have 4 options (A, B, C, D)
3. Only ONE correct answer per question
4. Questions must be clear and unambiguous
5. No hallucinations or content not from the material
6. Difficulty distribution: If mixed, ${difficultyDistribution}
7. CRITICAL: Each question must be NEW and DIFFERENT from all previously generated ones${duplicateGuard}

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
  validateQuestions(questions, questionCount);
  return questions;
};

module.exports = {
  generateQuestionsWithOpenAI,
};
