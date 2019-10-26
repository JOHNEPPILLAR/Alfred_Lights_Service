/**
 * Import external libraries
 */
const schedule = require('node-schedule');
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const allLightsOff = require('./allLightsOff.js');
const lightsOn = require('./lightsOn.js');
const lightsOff = require('./lightsOff.js');

/**
 * Setup light and light group names
 */
function setupSchedules() {
  // Cancel any existing timers
  serviceHelper.log(
    'trace',
    'Removing any existing timers and light/light group names',
  );
  global.schedules.forEach((value) => {
    value.cancel();
  });

  allLightsOff.setup(); // All off timers
  lightsOn.setup(); // On timers
  lightsOff.setup(); // Off timers
}

/**
 * Set up the timers
 */
exports.setSchedule = (runNow) => {
  if (runNow) {
    setupSchedules();
  }
  // Set timers each day to keep in sync with sunset changes
  const rule = new schedule.RecurrenceRule();
  rule.hour = 12;
  rule.minute = 5;
  schedule.scheduleJob(rule, () => {
    setupSchedules();
  }); // Set the timer
};
