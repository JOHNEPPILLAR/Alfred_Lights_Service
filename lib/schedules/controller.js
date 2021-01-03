/**
 * Import helper libraries
 */
const debug = require('debug')('Lights:Schedules_Controller');
const lightsSchedule = require('./lightsSchedule.js');

// Set up the schedules
async function setupSchedules() {
  // Clear current schedules array
  debug(`Clear current schedules`);
  this.schedules = [];

  debug(`Setting up Schedules`);
  await lightsSchedule.setup.call(this);

  // Activate schedules
  debug(`Activate Schedules`);
  await this.activateSchedules();
}

module.exports = {
  setupSchedules,
};
