/**
 * Import helper libraries
 */
const allLightsOff = require('./allLightsOff.js');
const lightsOff = require('./lightsOff.js');
const lightsOn = require('./lightsOn.js');

// Set up the schedules
async function setupSchedules() {
  // Clear current schedules array
  this.logger.debug(`${this._traceStack()} - Clear current schedules`);
  this.schedules = [];

  this.logger.trace(`${this._traceStack()} - Setting up Schedules`);
  await allLightsOff.setup.call(this); // All off schedules
  await lightsOff.setup.call(this); // Off schedules
  await lightsOn.setup.call(this); // On schedules

  // Activate schedules
  await this.activateSchedules();
}

module.exports = {
  setupSchedules,
};
