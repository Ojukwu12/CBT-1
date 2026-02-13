const fs = require('fs');
const path = require('path');

// Log levels
const LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

class Logger {
  constructor(module, isDev = null) {
    this.module = module;
    // Use NODE_ENV to determine isDev if not explicitly passed
    this.isDev = isDev !== null ? isDev : (process.env.NODE_ENV !== 'production');
    this.logsDir = path.join(__dirname, '../../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  format(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      ...meta,
    };
  }

  log(level, message, meta = {}) {
    const log = this.format(level, message, meta);
    const output = `[${log.timestamp}] [${log.level}] [${log.module}] ${log.message}`;
    const jsonOutput = JSON.stringify(log);

    // Always console output (enable visibility in all modes)
    if (level === LEVELS.ERROR) {
      console.error(output, meta);
    } else if (level === LEVELS.WARN) {
      console.warn(output, meta);
    } else {
      console.log(output, meta);
    }

    // File output (Phase 1: use proper logging service like Winston)
    if (level === LEVELS.ERROR) {
      const errorLog = path.join(this.logsDir, 'error.log');
      fs.appendFileSync(errorLog, jsonOutput + '\n');
    }
    
    // Log INFO, WARN, DEBUG to general log file in development
    if (level === LEVELS.INFO || level === LEVELS.WARN || level === LEVELS.DEBUG) {
      const generalLog = path.join(this.logsDir, 'app.log');
      fs.appendFileSync(generalLog, jsonOutput + '\n');
    }
  }

  error(message, error = null, meta = {}) {
    this.log(LEVELS.ERROR, message, {
      ...meta,
      error: error ? { message: error.message, stack: error.stack } : null,
    });
  }

  warn(message, meta = {}) {
    this.log(LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    if (this.isDev) {
      this.log(LEVELS.DEBUG, message, meta);
    }
  }
}

module.exports = Logger;
