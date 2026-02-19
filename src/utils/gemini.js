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

const generateQuestionsWithGemini = async (
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
  const models = getCandidateModels();
  const apiVersions = getCandidateApiVersions();

  const prompt = `
You are an expert question generator for university courses in Nigeria.
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
        validateQuestions(questions, questionCount);
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
