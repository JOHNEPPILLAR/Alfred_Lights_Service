/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const scheduler = require('node-schedule');
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const lightGroupHelper = require('../api/lights/light-groups.js');

function lightsOn(data) {
  try {
    serviceHelper.log('info', `Lights on schedule - Turning on ${data.name}`);

    const req = {
      params: { lightGroupNumber: data.light_group_number },
      body: {
        lightAction: 'on',
        brightness: data.brightness,
        scene: data.scene,
        colorLoop: data.color_loop,
      },
    };

    const updateLights = lightGroupHelper.updateLightGroup(req);
    if (updateLights instanceof Error) {
      throw new Error(`There was an error turning on light ${data.name}`);
    }
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
}

async function setupSchedule(data) {
  serviceHelper.log(
    'trace',
    `Create lights on schedule for ${data.name}`,
  );

  if (data.hour === null || data.minute === null) {
    serviceHelper.log('error', 'Schedule values were null');
    return false;
  }
  let rule = new scheduler.RecurrenceRule();
  if (data.ai_override) {
    const url = `${process.env.AlfredControllerService}/weather/sunset`;
    const sunsetData = await serviceHelper.callAlfredServiceGet(url, true);
    if (sunsetData instanceof Error) {
      serviceHelper.log(
        'trace',
        'Error getting sunset, so setting default override values',
      );
      rule.hour = data.hour;
      rule.minute = data.minute;
    } else {
      const sunSet = new Date(`${'01/01/1900 '}${sunsetData.data}`);
      sunSet.setMinutes(sunSet.getMinutes() - 30);

      // If sunset < 5pm then reset to 5pm
      if (dateFormat(sunSet, 'HH:MM') < '17:00') {
        sunSet.setHours(17);
        sunSet.setMinutes(0);
      }
      rule.hour = sunSet.getHours();
      rule.minute = sunSet.getMinutes();
    }
  } else {
    rule.hour = data.hour;
    rule.minute = data.minute;
  }
  const schedule = scheduler.scheduleJob(rule, () => {
    lightsOn(data);
  });
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `${data.name} schedule will run at: ${serviceHelper.zeroFill(
      rule.hour,
      2,
    )}:${serviceHelper.zeroFill(rule.minute, 2)}`,
  );
  rule = null; // Clear timer values
  return true;
}

/**
 * Set up  lights off schedules
 */
exports.setup = async () => {
  let dbClient;
  let results;

  try {
    // Get data from data store
    const SQL = 'SELECT name, hour, minute, light_group_number, brightness, scene, color_loop, ai_override FROM vw_lights_on_schedules';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get lights on timer settings');
    results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      // Exit function as no data to process
      serviceHelper.log('trace', 'No lights on timers are active');
      return false;
    }

    // Setup timers
    results.rows.forEach((info) => {
      setupSchedule(info);
    });
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
};
