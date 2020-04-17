/**
 * Import external libraries
 */
const scheduler = require('node-schedule');
const serviceHelper = require('alfred-helper');
const dateformat = require('dateformat');

/**
 * Import helper libraries
 */
const allLightsOff = require('./allLightsOff.js');
const lightsOn = require('./lightsOn.js');
const lightsOff = require('./lightsOff.js');

// Set up the schedules
async function setSchedule() {
  // Cancel any existing schedules
  serviceHelper.log(
    'trace',
    'Removing any existing schedules',
  );
  await global.schedules.map((value) => {
    if (value) value.cancel();
    return true;
  });

  // Set schedules each day to keep in sync with sunrise & sunset changes
  const date = new Date();
  date.setHours(3);
  date.setMinutes(5);
  date.setTime(date.getTime() + 1 * 86400000);
  const schedule = scheduler.scheduleJob(date, () => setSchedule()); // Set the schedule
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `Reset schedules will run on ${dateformat(date, 'dd-mm-yyyy @ HH:MM')}`,
  );
  await allLightsOff.setup(); // All off schedules
  await lightsOff.setup(); // Off schedules
  await lightsOn.setup(); // On schedules
}

exports.setSchedule = setSchedule;
