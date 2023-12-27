const expressWinston = require('express-winston');
const winston = require('winston');

// Define a custom format for console logging
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Create an Express middleware for logging HTTP requests
const expressLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console({
      format: consoleFormat // Use the custom format for console transport
    }),
    // Add a file transport for production use with JSON format
    new winston.transports.File({
      filename: 'requests.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  format: winston.format.combine(
    winston.format.colorize(), // Remove this from here
    winston.format.json() // And this one as well
  ),
  meta: true, // Set to `false` if you don't want to log request metadata
  msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms", // Customize the log message format
  expressFormat: false, // Set to `false` because we are using a custom format
  colorize: false, // This is handled in the consoleFormat
  ignoreRoute: function (req, res) { return false; } // Optional: skip logging for certain routes
});

module.exports = expressLogger;