const blockedKeys = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeValue(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);

  return Object.entries(value).reduce((safe, [key, nested]) => {
    if (blockedKeys.has(key)) return safe;
    const cleanKey = key.replace(/^\$/g, "").replace(/\./g, "");
    safe[cleanKey] = sanitizeValue(nested);
    return safe;
  }, {});
}

export function sanitizeRequest(req, _res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  if (req.query) req.query = sanitizeValue(req.query);
  next();
}
