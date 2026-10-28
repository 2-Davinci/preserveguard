// Catch requests to routes that don't exist
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Passes it down to the errorHandler
};

// Global Error Handler
export const errorHandler = (err, req, res, next) => {
  // If the status code is still 200 but an error fired, force it to 500
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Mongoose bad ObjectId error (e.g., fetching an ID that is too short)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  res.status(statusCode).json({
    message,
    // Only show the detailed stack trace in development
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};