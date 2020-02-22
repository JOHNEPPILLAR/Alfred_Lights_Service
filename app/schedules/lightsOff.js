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

function lightsOff(data) {
  try {
    serviceHelper.log('info', `Lights off schedule - Turning off ${data.name}`);

    const req = {
      params: { lightGroupNumber: data.light_group_number },
      body: {
        lightAction: 'off',
        brightness: data.brightness,
        scene: data.scene,
        colorLoop: data.color_loop,
      },
    };

    const updateLights = lightGroupHelper.updateLightGroup(req);
    if (updateLights instanceof Error) throw new Error(`There was an error turning off light ${data.name}`);
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
}

async function setupSchedule(data) {
  serviceHelper.log(
    'trace',
    `Create lights off schedule for ${data.name}`,
  );

  if (data.hour === null || data.minute === null) {
    serviceHelper.log('error', 'Schedule values were null');
    return false;
  }

  const date = new Date();
  if (data.ai_override) {
    serviceHelper.log('trace', 'AI override active');
    serviceHelper.log('trace', 'Getting sunrise data');
    const url = `${process.env.ALFRED_CONTROLLER_SERVICE}/weather/sunrise`;
    const sunsetData = await serviceHelper.callAlfredServiceGet(url, true);
    if (sunsetData instanceof Error) {
      serviceHelper.log(
        'trace',
        'Error getting sunrise, so setting default override values',
      );
      date.setHours(data.hour);
      date.setMinutes(data.minute);
    } else {
      const sunSet = new Date(`${'01/01/1900 '}${sunsetData.data}`);
      sunSet.setMinutes(sunSet.getMinutes() - 30);
      date.setHours(sunSet.getHours());
      date.setMinutes(sunSet.getMinutes());
    }
  } else {
    serviceHelper.log('trace', 'AI override not active');
    date.setHours(data.hour);
    date.setMinutes(data.minute);
  }
  const schedule = scheduler.scheduleJob(date, () => lightsOff(data));
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `${data.name} schedule will run at ${dateformat(date, 'dd-mm-yyyy @ HH:MM')}`,
  );
  return true;
}

/**
 * Set up lights off schedules
 */
exports.setup = async () => {
  let results;

  try {
    // Get data from data store
    const SQL = 'SELECT name, hour, minute, light_group_number, brightness, scene, color_loop, ai_override FROM light_schedules WHERE type = 2';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log('trace', 'Get lights off timer settings');
    results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      // Exit function as no data to process
      serviceHelper.log('info', 'No lights off timers are active');
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
