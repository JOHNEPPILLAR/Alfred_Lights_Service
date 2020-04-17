/**
 * Import external libraries
 */
const scheduler = require('node-schedule');
const serviceHelper = require('alfred-helper');
const dateformat = require('dateformat');

/**
 * Import helper libraries
 */
const lightGroupHelper = require('../api/lights/light-groups.js');

function allLightsOff() {
  try {
    serviceHelper.log(
      'info',
      'Lights off schedule - Turning off all lights',
    );
    const req = { params: { lightGroupNumber: 0, power: false, brightness: 0 } };
    const updateLights = lightGroupHelper.updateLightGroup(req);
    if (updateLights instanceof Error) throw new Error('There was an error turning off the lights');
    return true;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    return false;
  }
}

function setupSchedule(data) {
  serviceHelper.log(
    'trace',
    `Create lights off schedule for ${data.name}`,
  );

  if (data.hour === null || data.minute === null) {
    serviceHelper.log(
      'warn',
      'Schedule values were null',
    );
    return false;
  }

  const date = new Date();
  date.setHours(data.hour);
  date.setMinutes(data.minute);
  const schedule = scheduler.scheduleJob(date, () => allLightsOff());
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `${data.name} schedule will run at ${dateformat(date, 'dd-mm-yyyy @ HH:MM')}`,
  );
  return true;
}

/**
 * Set up lights off schedu;e
 */
exports.setup = async () => {
  let results;

  try {
    // Get data from data store
    const SQL = 'SELECT name, hour, minute FROM light_schedules WHERE type = 0 AND active AND light_group_number = 0';
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log(
      'trace',
      'Get lights off schedule settings',
    );
    results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      // Exit function as no data to process
      serviceHelper.log(
        'info',
        'No lights off schedules are active',
      );
      return false;
    }

    // Setup schedules
    results.rows.map(async (info) => {
      await setupSchedule(info);
    });
    return true;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    return false;
  }
};
