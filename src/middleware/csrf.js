const csurf = require("csurf");
const { sendResponse } = require("../utils/response");

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

const getCsrfToken = (req, res) => {
  sendResponse(
    res,
    200,
    { csrfToken: req.csrfToken() },
    "CSRF token generated"
  );
};

module.exports = { csrfProtection, getCsrfToken };
