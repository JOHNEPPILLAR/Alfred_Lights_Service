/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const serviceHelper = require('alfred_helper');

/**
 * Import helper libraries
 */
const lightsHelper = require('../api/lights/lights.js');

async function checkOffTimerIsActive(timerID) {
  let active = true;
  let results;
  let dbClient;

  try {
    const SQL = `SELECT name FROM timers where id = ${timerID} and active`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    dbClient = await global.schedulesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get list of active services');
    results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) active = false;
    return active;
  } catch (err) {
    serviceHelper.log('error', err.message);
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
    serviceHelper.log('trace', 'Processing sensor data');

    // Living room lights are off so check motion and brightness
    sensor.forEach((sensorItem) => {
      if (sensorItem.attributes.attributes.id === '13') {
        // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === '14') {
        // Ambient light sensor
        if (
          sensorItem.state.attributes.attributes.lightlevel <=
          sensorItem.config.attributes.attributes.tholddark
        ) {
          lowLight = true;
        }
      }
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Motion and light activated');

      req = { body: { lightGroupNumber: 7 } };
      const lightstate = await lightsHelper.lightGroupState(req);

      if (!lightstate.any_on) {
        let body;
        let turnOffLightTimer = false;
        let results;
        let dbClient;

        try {
          const SQL =
            'SELECT start_time, end_time, light_group_number, light_action, brightness, turn_off, scene FROM sensor_settings WHERE active AND sensor_id = 1';
          serviceHelper.log('trace', 'Connect to data store connection pool');
          dbClient = await global.lightsDataClient.connect(); // Connect to data store
          serviceHelper.log('trace', 'Get list of active services');
          results = await dbClient.query(SQL);
          serviceHelper.log(
            'trace',
            'Release the data store connection back to the pool',
          );
          await dbClient.release(); // Return data store connection back to pool

          if (results.rowCount === 0) {
            serviceHelper.log(
              'trace',
              'Fronthall - processData',
              'No active light sensor settings',
            );
            return false;
          }

          // Decide what scene and brightness to use depending upon time of day
          serviceHelper.log(
            'trace',
            'Decide what scene and brightness to use depending upon time of day',
          );

          const currentTime = dateFormat(new Date(), 'HH:MM');

          results.rows.forEach(async (lightInfo) => {
            if (
              currentTime >= lightInfo.start_time &&
              currentTime <= lightInfo.end_time
            ) {
              serviceHelper.log(
                'trace',
                `${currentTime} active in ${lightInfo.start_time} and ${lightInfo.end_time}`,
              );
              serviceHelper.log('trace', 'Construct the api call');
              body = {
                lightGroupNumber: lightInfo.light_group_number,
                lightAction: lightInfo.light_action,
                brightness: lightInfo.brightness,
                scene: lightInfo.scene,
              };
              serviceHelper.log('trace', JSON.stringify(body));

              serviceHelper.log(
                'trace',
                'Figure out if lights require turning off',
              );
              switch (lightInfo.turn_off) {
                case 'TRUE':
                  turnOffLightTimer = true;
                  break;
                case 'FALSE':
                  turnOffLightTimer = false;
                  break;
                default:
                  try {
                    turnOffLightTimer = await checkOffTimerIsActive(
                      lightInfo.turn_off,
                    );
                  } catch (err) {
                    serviceHelper.log('error', err.message);
                  }
              }

              req = { body };
              serviceHelper.log('trace', req);
              lightsHelper.lightGroupOnOff(req);

              if (turnOffLightTimer) {
                // Schedule to turn off lights after 3 minutes
                serviceHelper.log(
                  'trace',
                  `Setting ${serviceHelper.getLightGroupName(
                    lightInfo.light_group_number,
                  )} lights timer to turn off in 3 minutes`,
                );
                setTimeout(() => {
                  req = {
                    body: {
                      lightGroupNumber: lightInfo.light_group_number,
                      lightAction: 'off',
                    },
                  };
                  lightsHelper.lightGroupOnOff(req);
                }, turnOffIn);
              }
            }
          });
        } catch (err) {
          serviceHelper.log('error', err.message);
        }
      }
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
  return true;
};
