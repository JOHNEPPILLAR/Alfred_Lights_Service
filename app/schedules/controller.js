/**
 * Import external libraries
 */
const scheduler = require('node-schedule');
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
  // Cancel any existing schedules
  serviceHelper.log(
    'trace',
    'Removing any existing schedules and light/light group names',
  );
  global.schedules.forEach((value) => {
    value.cancel();
  });

  allLightsOff.setup(); // All off schedules
  lightsOn.setup(); // On schedules
  lightsOff.setup(); // Off schedules
}

/**
 * Set up the schedules
 */
exports.setSchedule = async (runNow) => {
  if (runNow) {
    await setupSchedules();
  }
  // Set schedules each day to keep in sync with sunset changes
  const rule = new scheduler.RecurrenceRule();
  rule.hour = 3;
  rule.minute = 5;
  scheduler.scheduleJob(rule, () => {
    setupSchedules();
  }); // Set the schedule
  serviceHelper.log(
    'info',
    `Reset schedules will run at: ${serviceHelper.zeroFill(
      rule.hour,
      2,
    )}:${serviceHelper.zeroFill(rule.minute, 2)}`,
  );
};
