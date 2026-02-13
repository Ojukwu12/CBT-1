const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
  if (error) {
    return next(new ApiError(400, 'Validation error', error.details.map(d => d.message)));
  }
  req[property] = value;
  next();
};

module.exports = validate;
