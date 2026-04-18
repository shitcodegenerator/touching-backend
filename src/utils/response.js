const sendSuccess = (
  res,
  data,
  statusCode = 200,
  meta = null,
  message = null,
) => {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 400) => {
  return res
    .status(statusCode)
    .json({ success: false, data: null, error: message });
};

module.exports = { sendSuccess, sendError };
