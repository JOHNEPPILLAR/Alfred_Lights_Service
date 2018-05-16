/**
 * Import external libraries
 */
const serviceHelper = require('../lib/helper.js');
const dateFormat = require('dateformat');
const lightsHelper = require('../api/lights/lights.js');
const { Client } = require('pg');

async function checkOffTimerIsActive(timerID) {
  // Create data store connection
  const client = new Client({
    host: process.env.DataStore,
    database: 'schedules',
    user: process.env.DataStoreUser,
    password: process.env.DataStoreUserPassword,
    port: 5432,
  });

  let active = true;

  const SQL = `SELECT name FROM timers where id = ${timerID} and active`;
  try {
    serviceHelper.log('trace', 'Livingroom - checkOffTimerIsActive', `Getting data for timer ${timerID}`);
    await client.connect();
    const results = await client.query(SQL);
    await client.end();
    if (results.rowCount === 0) { active = false; }
    return active;
  } catch (err) {
    serviceHelper.log('error', 'Livingroom - checkOffTimerIsActive', err);
    await client.end();
    return false;
  }
}

exports.processData = async (sensor) => {
  const turnOffIn = 180000; // 3 minutes

  let motion = false;
  let lowLight = false;
  let req;
  let offTimerActive;

  // Check sensors
  try {
    serviceHelper.log('trace', 'Livingroom - processData', 'Processing sensor data');

    // Living room lights are off so check motion and brightness
    sensor.forEach((sensorItem) => {
      if (sensorItem.attributes.attributes.id === '19') { // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === '20') { // Ambient light sensor
        if (sensorItem.state.attributes.attributes.lightlevel <= sensorItem.config.attributes.attributes.tholddark) lowLight = true;
      }
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Livingroom - processData', 'Motion and light activated');

      req = { body: { lightGroupNumber: 8 } };
      const lightstate = await lightsHelper.lightGroupState(req);

      if (!lightstate.any_on) {
        let body;
        const currentTime = (dateFormat(new Date(), 'HH:MM'));

        let turnOffLightTimer = false;

        // Decide what scene and brightness to use depending upon time of day
        serviceHelper.log('trace', 'Livingroom - processData', 'Decide what scene and brightness to use depending upon time of day');

        // if current time > mid-night then show low, read scene
        if (currentTime >= '00:00' && currentTime < '06:30') {
          body = {
            lightGroupNumber: 8, lightAction: 'on', brightness: 64, ct: 348,
          };
          turnOffLightTimer = true;
        }

        // if current time > 6:30am then show mid, energise scene
        if (currentTime >= '06:30' && currentTime < '08:30') {
          body = {
            lightGroupNumber: 8, lightAction: 'on', brightness: 128, ct: 156,
          };
          offTimerActive = await checkOffTimerIsActive(1);
          if (!offTimerActive) turnOffLightTimer = true;
        }

        // if current time > 8:30am then show high, concentrate scene
        if (currentTime >= '08:30' && currentTime < '15:00') {
          body = {
            lightGroupNumber: 8, lightAction: 'on', brightness: 192, ct: 233,
          };
          turnOffLightTimer = true;
        }

        // if current time > 3pm then show high, concentrate scene
        if (currentTime >= '15:00' && currentTime < '19:30') {
          body = {
            lightGroupNumber: 8, lightAction: 'on', brightness: 254, ct: 233,
          };
          offTimerActive = await checkOffTimerIsActive(2);
          if (!offTimerActive) turnOffLightTimer = true;
        }

        // if current time > 7:30pm then show mid, read scene
        if (currentTime >= '19:30' && currentTime < '22:00') {
          body = {
            lightGroupNumber: 8, lightAction: 'on', brightness: 100, ct: 348,
          };
          offTimerActive = await checkOffTimerIsActive(2);
          if (!offTimerActive) turnOffLightTimer = true;
        }

        // if current time > 10pm then show low, read scene
        if (currentTime >= '22:00' && currentTime <= '23:59') {
          body = {
            lightGroupNumber: 8, lightAction: 'on', brightness: 64, ct: 348,
          };
          turnOffLightTimer = true;
        }

        req = { body };
        lightsHelper.lightGroupOnOff(req);

        if (turnOffLightTimer) { // Schedule to turn off lights after 3 minutes
          serviceHelper.log('trace', 'Livingroom - processData', `Setting timer to turn off ${serviceHelper.getLightGroupName(8)} lights in 3 minutes`);
          setTimeout(() => {
            req = { body: { lightGroupNumber: 8, lightAction: 'off' } };
            lightsHelper.lightGroupOnOff(req);
          }, turnOffIn);
        }
      }
    }
  } catch (err) {
    serviceHelper.log('error', 'Livingroom - processData', err);
  }
};
