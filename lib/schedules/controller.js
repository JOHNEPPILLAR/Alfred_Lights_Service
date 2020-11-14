/**
 * Import helper libraries
 */
const lightsSchedule = require('./lightsSchedule.js');

// Set up the schedules
async function setupSchedules() {
  // Clear current schedules array
  this.logger.debug(`${this._traceStack()} - Clear current schedules`);
  this.schedules = [];

  this.logger.trace(`${this._traceStack()} - Setting up Schedules`);
  await lightsSchedule.setup.call(this);

  // Activate schedules
  await this.activateSchedules();
}

module.exports = {
  setupSchedules,
};
