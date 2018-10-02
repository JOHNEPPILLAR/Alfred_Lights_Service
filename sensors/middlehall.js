
/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const serviceHelper = require('../lib/helper.js');
const lightsHelper = require('../api/lights/lights.js');

async function checkOffTimerIsActive(timerID) {
  serviceHelper.log('trace', 'Middlehall - checkOffTimerIsActive', `Getting data for timer ${timerID}`);
  let active = true;
  let results;
  let dbClient;

  try {
    const SQL = `SELECT name FROM timers where id = ${timerID} and active`;
    serviceHelper.log('trace', 'Middlehall - processData', 'Connect to data store connection pool');
    dbClient = await global.schedulesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Middlehall - processData', 'Get list of active services');
    results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'Middlehall - processData', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) active = false;
    return active;
  } catch (err) {
    serviceHelper.log('error', 'Middlehall - processData', err);
  }
  return active;
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
        if (sensorItem.state.attributes.attributes.lightlevel
          <= sensorItem.config.attributes.attributes.tholddark) {
          lowLight = true;
        }
      }
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Middlehall - processData', 'Motion and light activated');

      req = { body: { lightNumber: 1 } };
      const lightstate = await lightsHelper.lightState(req);

      if (!lightstate.on) {
        let body;
        let turnOffLightTimer = false;
        let results;
        let dbClient;

        try {
          const SQL = 'SELECT startTime, endTime, lightGroupNumber, lightAction, brightness, turnOff, scene FROM sensorsettings WHERE active AND sensorID = 3';
          serviceHelper.log('trace', 'Middlehall - processData', 'Connect to data store connection pool');
          dbClient = await global.lightsDataClient.connect(); // Connect to data store
          serviceHelper.log('trace', 'Middlehall - processData', 'Get list of active services');
          results = await dbClient.query(SQL);
          serviceHelper.log('trace', 'Middlehall - processData', 'Release the data store connection back to the pool');
          await dbClient.release(); // Return data store connection back to pool

          if (results.rowCount === 0) {
            serviceHelper.log('trace', 'Middlehall - processData', 'No active light sensor settings');
            return false;
          }

          // Decide what scene and brightness to use depending upon time of day
          serviceHelper.log('trace', 'Middlehall - processData', 'Decide what scene and brightness to use depending upon time of day');

          const currentTime = (dateFormat(new Date(), 'HH:MM'));

          results.rows.forEach(async (lightInfo) => {
            if (currentTime >= lightInfo.start_time && currentTime <= lightInfo.end_time) {
              serviceHelper.log('trace', 'Middlehall - processData', `${currentTime} active in ${lightInfo.start_time} and ${lightInfo.end_time}`);

              serviceHelper.log('trace', 'Middlehall - processData', 'Construct the api call');
              body = {
                lightNumber: lightInfo.light_group_number,
                lightAction: lightInfo.light_action,
                brightness: lightInfo.brightness,
                scene: lightInfo.scene,
              };

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
                    serviceHelper.log('error', 'Middlehall - processData', err);
                  }
              }

              req = { body };
              lightsHelper.lightOnOff(req);

              if (turnOffLightTimer) { // Schedule to turn off lights after 3 minutes
                serviceHelper.log('trace', 'Middlehall - processData', `Setting ${serviceHelper.getLightName(lightInfo.light_group_number)} lights timer to turn off in 3 minutes`);
                setTimeout(() => {
                  req = { body: { lightNumber: lightInfo.light_group_number, lightAction: 'off' } };
                  lightsHelper.lightOnOff(req);
                }, turnOffIn);
              }
            }
          });
        } catch (err) {
          serviceHelper.log('error', 'Middlehall - processData', err);
        }
      }
    }
  } catch (err) {
    serviceHelper.log('error', 'Middlehall - processData', err);
  }
  return true;
};
