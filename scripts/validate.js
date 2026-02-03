#!/usr/bin/env node

/**
 * Phase 0 Backend - Health Check & Validation Script
 * Verifies all models, services, controllers, and routes are properly loaded
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

let passedTests = 0;
let failedTests = 0;

function testFileExists(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      log.success(description);
      passedTests++;
      return true;
    } else {
      log.error(`${description} - FILE NOT FOUND: ${filePath}`);
      failedTests++;
      return false;
    }
  } catch (err) {
    log.error(`${description} - ERROR: ${err.message}`);
    failedTests++;
    return false;
  }
}

function testFileContent(filePath, searchString, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      log.success(description);
      passedTests++;
      return true;
    } else {
      log.error(`${description} - CONTENT NOT FOUND: "${searchString}"`);
      failedTests++;
      return false;
    }
  } catch (err) {
    log.error(`${description} - ERROR: ${err.message}`);
    failedTests++;
    return false;
  }
}

// Start tests
console.clear();
console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════╗`);
console.log(`║  Phase 0 Backend - Validation & Health Check       ║`);
console.log(`╚════════════════════════════════════════════════════╝${colors.reset}\n`);

const srcPath = path.join(__dirname, 'src');
const modelsPath = path.join(srcPath, 'models');
const servicesPath = path.join(srcPath, 'services');
const controllersPath = path.join(srcPath, 'controllers');
const routesPath = path.join(srcPath, 'routes');
const middlewarePath = path.join(srcPath, 'middleware');
const utilsPath = path.join(srcPath, 'utils');
const validatorsPath = path.join(srcPath, 'validators');
const configPath = path.join(srcPath, 'config');

// 1. Models Test
log.header('1. Database Models (9 required)');
const models = [
  [path.join(modelsPath, 'University.js'), 'University Model'],
  [path.join(modelsPath, 'Faculty.js'), 'Faculty Model'],
  [path.join(modelsPath, 'Department.js'), 'Department Model'],
  [path.join(modelsPath, 'Course.js'), 'Course Model'],
  [path.join(modelsPath, 'Topic.js'), 'Topic Model'],
  [path.join(modelsPath, 'Question.js'), 'Question Model'],
  [path.join(modelsPath, 'Material.js'), 'Material Model'],
  [path.join(modelsPath, 'User.js'), 'User Model'],
  [path.join(modelsPath, 'AIGenerationLog.js'), 'AIGenerationLog Model'],
];
models.forEach(([file, desc]) => testFileExists(file, desc));

// 2. Services Test
log.header('2. Service Layer (8 required)');
const services = [
  [path.join(servicesPath, 'universityService.js'), 'University Service'],
  [path.join(servicesPath, 'facultyService.js'), 'Faculty Service'],
  [path.join(servicesPath, 'departmentService.js'), 'Department Service'],
  [path.join(servicesPath, 'courseService.js'), 'Course Service'],
  [path.join(servicesPath, 'topicService.js'), 'Topic Service'],
  [path.join(servicesPath, 'questionService.js'), 'Question Service'],
  [path.join(servicesPath, 'materialService.js'), 'Material Service'],
  [path.join(servicesPath, 'userService.js'), 'User Service'],
];
services.forEach(([file, desc]) => testFileExists(file, desc));

// 3. Controllers Test
log.header('3. Controllers (8 required)');
const controllers = [
  [path.join(controllersPath, 'universityController.js'), 'University Controller'],
  [path.join(controllersPath, 'facultyController.js'), 'Faculty Controller'],
  [path.join(controllersPath, 'departmentController.js'), 'Department Controller'],
  [path.join(controllersPath, 'courseController.js'), 'Course Controller'],
  [path.join(controllersPath, 'topicController.js'), 'Topic Controller'],
  [path.join(controllersPath, 'questionController.js'), 'Question Controller'],
  [path.join(controllersPath, 'materialController.js'), 'Material Controller'],
  [path.join(controllersPath, 'userController.js'), 'User Controller'],
];
controllers.forEach(([file, desc]) => testFileExists(file, desc));

// 4. Routes Test
log.header('4. API Routes (9 required)');
const routes = [
  [path.join(routesPath, 'university.routes.js'), 'University Routes'],
  [path.join(routesPath, 'faculty.routes.js'), 'Faculty Routes'],
  [path.join(routesPath, 'department.routes.js'), 'Department Routes'],
  [path.join(routesPath, 'course.routes.js'), 'Course Routes'],
  [path.join(routesPath, 'topic.routes.js'), 'Topic Routes'],
  [path.join(routesPath, 'question.routes.js'), 'Question Routes'],
  [path.join(routesPath, 'material.routes.js'), 'Material Routes'],
  [path.join(routesPath, 'user.routes.js'), 'User Routes'],
  [path.join(routesPath, 'health.routes.js'), 'Health Check Routes'],
];
routes.forEach(([file, desc]) => testFileExists(file, desc));

// 5. Middleware Test
log.header('5. Middleware (5 required)');
const middleware = [
  [path.join(middlewarePath, 'error.middleware.js'), 'Global Error Middleware'],
  [path.join(middlewarePath, 'validate.middleware.js'), 'Joi Validation Middleware'],
  [path.join(middlewarePath, 'requestId.middleware.js'), 'Request ID Middleware'],
  [path.join(middlewarePath, 'rateLimit.middleware.js'), 'Rate Limiting Middleware'],
  [path.join(middlewarePath, 'requestLogger.middleware.js'), 'Request Logger Middleware'],
];
middleware.forEach(([file, desc]) => testFileExists(file, desc));

// 6. Utilities Test
log.header('6. Utilities (8 required)');
const utilities = [
  [path.join(utilsPath, 'ApiError.js'), 'ApiError Class'],
  [path.join(utilsPath, 'asyncHandler.js'), 'Async Handler'],
  [path.join(utilsPath, 'gemini.js'), 'Gemini Integration'],
  [path.join(utilsPath, 'logger.js'), 'Logger Utility'],
  [path.join(utilsPath, 'cache.js'), 'Cache Utility'],
  [path.join(utilsPath, 'pagination.js'), 'Pagination Utility'],
  [path.join(utilsPath, 'sanitizer.js'), 'Sanitizer Utility'],
  [path.join(utilsPath, 'apiResponse.js'), 'API Response Builder'],
];
utilities.forEach(([file, desc]) => testFileExists(file, desc));

// 7. Validators Test
log.header('7. Joi Validators (7 required)');
const validators = [
  [path.join(validatorsPath, 'faculty.validator.js'), 'Faculty Validator'],
  [path.join(validatorsPath, 'department.validator.js'), 'Department Validator'],
  [path.join(validatorsPath, 'course.validator.js'), 'Course Validator'],
  [path.join(validatorsPath, 'topic.validator.js'), 'Topic Validator'],
  [path.join(validatorsPath, 'question.validator.js'), 'Question Validator'],
  [path.join(validatorsPath, 'material.validator.js'), 'Material Validator'],
  [path.join(validatorsPath, 'user.validator.js'), 'User Validator'],
];
validators.forEach(([file, desc]) => testFileExists(file, desc));

// 8. Config Test
log.header('8. Configuration Files (3 required)');
testFileExists(path.join(configPath, 'env.js'), 'Environment Config');
testFileExists(path.join(configPath, 'database.js'), 'Database Config');
testFileExists(path.join(configPath, 'indexes.js'), 'Database Indexes Config');

// 9. Main Application Files
log.header('9. Main Application Files');
testFileExists(path.join(srcPath, 'app.js'), 'Express App Setup');
testFileExists(path.join(srcPath, 'server.js'), 'Server Entry Point');

// 10. Root Configuration
log.header('10. Root Configuration Files');
testFileExists(path.join(__dirname, 'package.json'), 'Package.json');
testFileExists(path.join(__dirname, '.env.example'), '.env.example');

// 11. Application Files Content Checks
log.header('11. Code Integration Checks');
testFileContent(
  path.join(srcPath, 'app.js'),
  "require('./routes/university.routes')",
  'App has University routes imported'
);
testFileContent(
  path.join(srcPath, 'app.js'),
  "require('./middleware/error.middleware')",
  'App has Error middleware imported'
);
testFileContent(
  path.join(srcPath, 'server.js'),
  'require(\'./config/database\')',
  'Server has Database config'
);
testFileContent(
  path.join(servicesPath, 'universityService.js'),
  'University',
  'Services use Models'
);

// 12. Dependencies Check
log.header('12. Dependencies in package.json');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const requiredDeps = [
  'express',
  'mongoose',
  'joi',
  '@google/generative-ai',
  'dotenv',
  'helmet',
  'cors',
  'morgan',
  'compression',
  'express-rate-limit',
  'uuid',
];
requiredDeps.forEach((dep) => {
  if (packageJson.dependencies[dep]) {
    log.success(`${dep} - ${packageJson.dependencies[dep]}`);
    passedTests++;
  } else {
    log.error(`${dep} - NOT FOUND in dependencies`);
    failedTests++;
  }
});

// Summary
log.header('VALIDATION SUMMARY');
const total = passedTests + failedTests;
const percentage = Math.round((passedTests / total) * 100);
console.log(`\nTotal Tests: ${total}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
console.log(`Success Rate: ${colors.cyan}${percentage}%${colors.reset}\n`);

if (failedTests === 0) {
  console.log(`${colors.green}╔════════════════════════════════════════════════════╗`);
  console.log(`║  ✓ All Systems Go! Phase 0 Backend is Ready         ║`);
  console.log(`║                                                    ║`);
  console.log(`║  To start the server:                              ║`);
  console.log(`║  $ npm run seed  (first time only)                 ║`);
  console.log(`║  $ npm run dev                                     ║`);
  console.log(`║                                                    ║`);
  console.log(`║  Server will run on: http://localhost:3000        ║`);
  console.log(`╚════════════════════════════════════════════════════╝${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}╔════════════════════════════════════════════════════╗`);
  console.log(`║  ✗ Some Tests Failed - Please Review Above         ║`);
  console.log(`╚════════════════════════════════════════════════════╝${colors.reset}\n`);
  process.exit(1);
}
