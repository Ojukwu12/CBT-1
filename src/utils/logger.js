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
  constructor(module, isDev = true) {
    this.module = module;
    this.isDev = isDev;
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
    const output = JSON.stringify(log);

    // Console output
    if (this.isDev) {
      console.log(output);
    }

    // File output (Phase 1: use proper logging service like Winston)
    if (level === LEVELS.ERROR) {
      const errorLog = path.join(this.logsDir, 'error.log');
      fs.appendFileSync(errorLog, output + '\n');
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
