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
  serviceHelper.log('trace', `Getting data for timer ${timerID}`);
  let active = true;
  try {
    const SQL = `SELECT name FROM light_schedules WHERE id = ${timerID} AND active`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log('trace', 'Get list of active services');
    const results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

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
    sensor.map((sensorItem) => {
      if (sensorItem.attributes.attributes.id === '27') {
        // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === '28') {
        // Ambient light sensor
        if (
          sensorItem.state.attributes.attributes.lightlevel
          <= sensorItem.config.attributes.attributes.tholddark
        ) lowLight = true;
      }
      return true;
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Motion and light activated');

      const params = { lightGroupNumber: 6 };

      req = { params };
      const lightstate = await lightGroupHelper.lightGroupState(req);

      if (!lightstate.state.attributes.any_on) {
        let body;
        let turnOffLightTimer = false;
        let results;

        try {
          const SQL = 'SELECT start_time, end_time, light_group_number, light_action, brightness, turn_off, scene FROM sensor_schedules WHERE active AND sensor_id = 3';
          serviceHelper.log('trace', 'Connect to data store connection pool');
          const dbConnection = await serviceHelper.connectToDB('lights');
          serviceHelper.log('trace', 'Get list of active services');
          results = await dbConnection.query(SQL);
          serviceHelper.log(
            'trace',
            'Release the data store connection back to the pool',
          );
          await dbConnection.end(); // Close data store connection
          if (results.rowCount === 0) {
            serviceHelper.log('trace', 'No active light sensor settings');
            return false;
          }

          // Decide what scene and brightness to use depending upon time of day
          serviceHelper.log(
            'trace',
            'Decide what scene and brightness to use depending upon time of day',
          );

          const currentTime = dateFormat(new Date(), 'HH:MM');

          results.rows.map(async (lightInfo) => {
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
                    turnOffLightTimer = true;
                  }
              }

              req = { params, body };
              lightGroupHelper.updateLightGroup(req);

              if (turnOffLightTimer) {
                // Schedule to turn off lights after 3 minutes
                serviceHelper.log(
                  'info',
                  `Setting ${serviceHelper.getLightName(
                    lightInfo.light_group_number,
                  )} lights timer to turn off in 3 minutes`,
                );
                setTimeout(() => {
                  req = {
                    params,
                    body: {
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
