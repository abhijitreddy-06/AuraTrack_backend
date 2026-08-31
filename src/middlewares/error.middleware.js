export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let error = null;

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  // Handle token expiry
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Handle Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message = "User with this email already exists";
  }

  // Handle Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = "Validation error";
    error = err.errors.map((e) => e.message).join(", ");
  }

  // Handle other Sequelize errors
  if (err.name === "SequelizeError") {
    statusCode = 500;
    message = "Database error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error && { error }),
  });
};
