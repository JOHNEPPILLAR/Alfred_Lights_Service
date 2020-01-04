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
async function setupSchedules() {
  // Cancel any existing schedules
  serviceHelper.log(
    'trace',
    'Removing any existing schedules and light/light group names',
  );
  await global.schedules.map((value) => value.cancel());

  await allLightsOff.setup(); // All off schedules
  await lightsOff.setup(); // Off schedules
  await lightsOn.setup(); // On schedules
}

// Set up the schedules
exports.setSchedule = async () => {
  await setupSchedules();

  // Set schedules each day to keep in sync with sunrise & sunset changes
  const rule = new scheduler.RecurrenceRule();
  rule.hour = 3;
  rule.minute = 5;
  const schedule = scheduler.scheduleJob(rule, () => {
    serviceHelper.log('info', 'Resetting daily schedules to keep in sync with sunrise & sunset changes');
    setupSchedules();
  }); // Set the schedule
  global.schedules.push(schedule);

  serviceHelper.log(
    'info',
    `Reset schedules will run at: ${serviceHelper.zeroFill(
      rule.hour,
      2,
    )}:${serviceHelper.zeroFill(rule.minute, 2)}`,
  );
};
