/**
 * Import helper libraries
 */
const allLightsOff = require('./allLightsOff.js');
const lightsOff = require('./lightsOff.js');
const lightsOn = require('./lightsOn.js');

// Set up the schedules
async function setupSchedules() {
  this.logger.trace(`${this._traceStack()} - Setting up Schedules`);
  await allLightsOff.setup.call(this); // All off schedules
  await lightsOff.setup.call(this); // Off schedules
  await lightsOn.setup.call(this); // On schedules
}

module.exports = {
  setupSchedules,
};
