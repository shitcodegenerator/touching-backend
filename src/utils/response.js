const sendSuccess = (res, data, statusCode = 200, meta = null) => {
  const response = { success: true, data }
  if (meta) response.meta = meta
  return res.status(statusCode).json(response)
}

const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, data: null, error: message })
}

module.exports = { sendSuccess, sendError }
