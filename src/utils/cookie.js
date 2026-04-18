const TOKEN_COOKIE_NAME = "token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const setTokenCookie = (res, token) => {
  res.cookie(TOKEN_COOKIE_NAME, token, COOKIE_OPTIONS);
};

const clearTokenCookie = (res) => {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
};

module.exports = {
  TOKEN_COOKIE_NAME,
  COOKIE_OPTIONS,
  setTokenCookie,
  clearTokenCookie,
};
