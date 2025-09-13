const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error("❌ Error:", err);

  if (err.name === "CastError") {
    const message = "Invalid resource ID format";
    error = { message, statusCode: 400 };
  }

  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = { message, statusCode: 400 };
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message: message.join(", "), statusCode: 400 };
  }

  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    const message = "Database connection error";
    error = { message, statusCode: 503 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  });
};

module.exports = errorHandler;
