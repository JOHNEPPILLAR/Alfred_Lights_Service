/**
 * Import external libraries
 */
const scheduler = require('node-schedule');
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const lightGroupHelper = require('../api/lights/light-groups.js');

function allLightsOff() {
  try {
    serviceHelper.log('info', 'Lights off schedule - Turning off all lights');
    const req = { params: { lightGroupNumber: 0 }, body: { lightAction: 'off' } };
    const updateLights = lightGroupHelper.updateLightGroup(req);
    if (updateLights instanceof Error) {
      throw new Error('There was an error turning off the lights');
    }
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
}

function setupSchedule(data) {
  serviceHelper.log(
    'trace',
    `Create lights off schedule for ${data.name}`,
  );

  if (data.hour === null || data.minute === null) {
    serviceHelper.log('warn', 'Schedule values were null');
    return false;
  }
  let rule = new scheduler.RecurrenceRule();
  rule.hour = data.hour;
  rule.minute = data.minute;
  const schedule = scheduler.scheduleJob(rule, () => {
    allLightsOff();
  });
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `${data.name} schedule will run at: ${serviceHelper.zeroFill(
      rule.hour,
      2,
    )}:${serviceHelper.zeroFill(rule.minute, 2)}`,
  );
  rule = null; // Clear schedule values
  return true;
}

/**
 * Set up lights off schedu;e
 */
exports.setup = async () => {
  let dbClient;
  let results;

  try {
    // Get data from data store
    const SQL = 'SELECT name, hour, minute FROM light_schedules WHERE type = 0 AND active AND light_group_number = 0';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get lights off schedule settings');
    results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      // Exit function as no data to process
      serviceHelper.log('info', 'No lights off schedules are active');
      return false;
    }

    // Setup schedules
    results.rows.forEach((info) => {
      setupSchedule(info);
    });
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
};
