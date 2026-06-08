export function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
      validationError.statusCode = 400;
      return next(validationError);
    }
    req.body = value;
    return next();
  };
}
