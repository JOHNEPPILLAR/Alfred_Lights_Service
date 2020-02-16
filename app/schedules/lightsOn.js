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
  if (data.hour === null || data.minute === null) {
    serviceHelper.log('error', 'Schedule values were null');
    return;
  }

  if (data.light_group_number === 4) { // 4 = Girls room
    const kidsAtHomeToday = await serviceHelper.kidsAtHomeToday();
    if (!kidsAtHomeToday) {
      serviceHelper.log('info', 'Override schedule: Girls are not staying');
      return;
    }
  }

  serviceHelper.log('trace', `Create lights on schedule for ${data.name}`);
  let rule = new scheduler.RecurrenceRule();
  if (data.ai_override) {
    serviceHelper.log('trace', 'Getting sunset data');
    const url = `${process.env.ALFRED_CONTROLLER_SERVICE}/weather/sunset`;
    serviceHelper.log('trace', url);
    const sunsetData = await serviceHelper.callAlfredServiceGet(url);
    if (sunsetData instanceof Error) {
      serviceHelper.log(
        'error',
        sunsetData.message,
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
}

/**
 * Set up lights on schedules
 */
exports.setup = async () => {
  let results;

  try {
    // Get data from data store
    const SQL = 'SELECT name, hour, minute, light_group_number, brightness, scene, color_loop, ai_override FROM vw_lights_on_schedules';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log('trace', 'Get lights on timer settings');
    results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      // Exit function as no data to process
      serviceHelper.log('info', 'No lights on timers are active');
      return false;
    }

    // Setup schedules
    results.rows.map(async (info) => {
      await setupSchedule(info);
    });
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
};
