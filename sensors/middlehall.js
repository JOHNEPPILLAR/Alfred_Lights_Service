
/**
 * Import external libraries
 */
const serviceHelper = require('../lib/helper.js');
const dateFormat = require('dateformat');
const lightsHelper = require('../api/lights/lights.js');

function checkOffTimerIsActive(timerID) {
  serviceHelper.log('trace', 'Middlehall - checkOffTimerIsActive', `Getting data for timer ${timerID}`);
  let active = true;
  let results;

  (async () => {
    try {
      const SQL = `SELECT name FROM timers where id = ${timerID} and active`;
      serviceHelper.log('trace', 'Middlehall - checkOffTimerIsActive', 'Get list of settings from data store');
      await global.schedulesDataClient.connect(); // Connect to data store
      results = await global.schedulesDataClient.query(SQL);
    } finally {
      global.schedulesDataClient.release(); // Return data store connection back to pool
    }
    if (results.rowCount === 0) active = false;
    return active;
  })().catch((err) => {
    serviceHelper.log('errir', 'Middlehall - checkOffTimerIsActive', err);
    return false;
  });
}

exports.processData = async (sensor) => {
  const turnOffIn = 180000; // 3 minutes

  let motion = false;
  let lowLight = false;
  let req;

  // Check sensors
  try {
    serviceHelper.log('trace', 'Middlehall - processData', 'Processing sensor data');

    // Living room lights are off so check motion and brightness
    sensor.forEach((sensorItem) => {
      if (sensorItem.attributes.attributes.id === '27') { // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === '28') { // Ambient light sensor
        if (sensorItem.state.attributes.attributes.lightlevel <= sensorItem.config.attributes.attributes.tholddark) lowLight = true;
      }
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Middlehall - processData', 'Motion and light activated');

      req = { body: { lightNumber: 1 } };
      const lightstate = await lightsHelper.lightState(req);

      if (!lightstate.on) {
        let body;
        let turnOffLightTimer = false;
        let lightData;

        (async () => {
          try {
            const SQL = 'SELECT start_time, end_time, light_group_number, light_action, brightness, turn_off, ct FROM sensor_settings WHERE active AND sensor_id = 3';
            serviceHelper.log('trace', 'Middlehall - processData', 'Get list of settings from data store');
            await global.lightsDataClient.connect(); // Connect to data store
            lightData = await global.lightsDataClient.query(SQL);
          } finally {
            global.lightsDataClient.release(); // Return data store connection back to pool
          }
        })().catch((err) => {
          serviceHelper.log('errir', 'Middlehall - processData', err);
          return false;
        });

        if (lightData.rowCount === 0) {
          serviceHelper.log('trace', 'Middlehall - processData', 'No active light sensor settings');
          return false;
        }

        // Decide what scene and brightness to use depending upon time of day
        serviceHelper.log('trace', 'Middlehall - processData', 'Decide what scene and brightness to use depending upon time of day');

        const currentTime = (dateFormat(new Date(), 'HH:MM'));

        lightData.rows.forEach(async (lightInfo) => {
          if (currentTime >= lightInfo.start_time && currentTime <= lightInfo.end_time) {
            serviceHelper.log('trace', 'Middlehall - processData', `${currentTime} active in ${lightInfo.start_time} and ${lightInfo.end_time}`);

            serviceHelper.log('trace', 'Middlehall - processData', 'Construct the api call');
            body = {
              lightNumber: lightInfo.light_group_number,
              lightAction: lightInfo.light_action,
              brightness: lightInfo.brightness,
            };

            if (lightInfo.ct != null) body.ct = lightInfo.ct;
            serviceHelper.log('trace', 'Middlehall - processData', JSON.stringify(body));

            serviceHelper.log('trace', 'Middlehall - processData', 'Figure out if lights require turning off');
            switch (lightInfo.turn_off) {
              case 'TRUE':
                turnOffLightTimer = true;
                break;
              case 'FALSE':
                turnOffLightTimer = false;
                break;
              default:
                try {
                  turnOffLightTimer = await checkOffTimerIsActive(lightInfo.turn_off);
                } catch (err) {
                  serviceHelper.log('errir', 'Middlehall - processData', err);
                }
            }

            req = { body };
            lightsHelper.lightGroupOnOff(req);

            if (turnOffLightTimer) { // Schedule to turn off lights after 3 minutes
              serviceHelper.log('trace', 'Middlehall - processData', `Setting ${serviceHelper.getLightGroupName(8)} lights timer to turn off in 3 minutes`);
              setTimeout(() => {
                req = { body: { lightGroupNumber: 7, lightAction: 'off' } };
                lightsHelper.lightGroupOnOff(req);
              }, turnOffIn);
            }
          }
        });
      }
    }
  } catch (err) {
    serviceHelper.log('error', 'Middlehall - processData', err);
  }
  return true;
};
