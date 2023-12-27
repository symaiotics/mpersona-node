const winston = require('winston');

const enumerateErrorFormat = winston.format(info => {
  if (info.message instanceof Error) {
    info.message = {
      message: info.message.message,
      stack: info.message.stack
    };
  }

  if (info instanceof Error) {
    return {
      message: info.message,
      stack: info.stack
    };
  }

  return info;
});

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }) // To include stack trace if available
  ),
  transports: [
    new winston.transports.Console({
      format: consoleFormat // Use the console format for console transport
    }),
    // File transport for JSON output
    new winston.transports.File({
      filename: 'combined.log',
      format: winston.format.json() // Log in JSON format to the file
    })
  ],
});

module.exports = logger;