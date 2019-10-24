/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const lightGroupHelper = require('../api/lights/light-groups.js');

async function checkOffTimerIsActive(timerID) {
  let active = true;
  try {
    const SQL = `SELECT name FROM light_schedules WHERE id = ${timerID} AND active`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get list of active services');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool
    if (results.rowCount === 0) active = false;
    return active;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
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
          sensorItem.state.attributes.attributes.lightlevel
          <= sensorItem.config.attributes.attributes.tholddark
        ) { lowLight = true; }
      }
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Motion and light activated');

      const params = { lightGroupNumber: 7 };

      req = { params };
      const lightstate = await lightGroupHelper.lightGroupState(req);

      if (!lightstate.state.attributes.any_on) {
        let body;
        let turnOffLightTimer = false;
        let dbClient;
        let results;

        try {
          const SQL = 'SELECT start_time, end_time, light_group_number, light_action, brightness, turn_off, scene FROM sensor_schedules WHERE active AND sensor_id = 1';
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
              currentTime >= lightInfo.start_time
              && currentTime <= lightInfo.end_time
            ) {
              serviceHelper.log(
                'trace',
                'Found a schedule, so will turn on light group',
              );

              serviceHelper.log('trace', 'Construct the api call');
              body = {
                lightAction: lightInfo.light_action,
                brightness: lightInfo.brightness,
                scene: lightInfo.scene,
              };
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

              req = { params, body };
              serviceHelper.log('trace', req);
              lightGroupHelper.updateLightGroup(req);

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
                    params,
                    body: {
                      lightGroupNumber: lightInfo.light_group_number,
                      lightAction: 'off',
                    },
                  };
                  lightGroupHelper.updateLightGroup(req);
                }, turnOffIn);
              }
            }
          });
        } catch (err) {
          serviceHelper.log('error', err.message);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    serviceHelper.log('error', err.message);
    return false;
  }
};
