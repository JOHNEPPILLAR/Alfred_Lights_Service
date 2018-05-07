
/**
 * Import external libraries
 */
const serviceHelper = require('../lib/helper.js');
const dateFormat = require('dateformat');
const lightsHelper = require('../api/lights/lights.js');

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
        const currentTime = (dateFormat(new Date(), 'HH:MM'));

        // Decide what scene and brightness to use depending upon time of day
        serviceHelper.log('trace', 'Middlehall - processData', 'Decide what scene and brightness to use depending upon time of day');

        // if current time > mid-night then show low, read scene
        if (currentTime >= '00:00' && currentTime < '06:30') {
          body = {
            lightNumber: 1, lightAction: 'on', brightness: 60, ct: 348,
          };
        }

        // if current time > 6:30am then show mid, energise scene
        if (currentTime >= '06:30' && currentTime < '15:30') {
          body = {
            lightNumber: 1, lightAction: 'on', brightness: 128, ct: 156,
          };
        }

        // if current time > 3:30pm then show high, concentrate scene
        if (currentTime >= '15:30' && currentTime < '19:30') {
          body = {
            lightNumber: 1, lightAction: 'on', brightness: 200, ct: 233,
          };
        }

        // if current time > 7:30pm then show mid, energise scene
        if (currentTime >= '19:30' && currentTime < '21:00') {
          body = {
            lightNumber: 1, lightAction: 'on', brightness: 128, ct: 156,
          };
        }

        // if current time > 9pm then show low, read scene
        if (currentTime >= '21:00' && currentTime <= '23:59') {
          body = {
            lightNumber: 1, lightAction: 'on', brightness: 60, ct: 348,
          };
        }

        req = { body };
        lightsHelper.lightOnOff(req);

        serviceHelper.log('trace', 'Middlehall - processData', `Setting timer to turn off ${serviceHelper.getLightGroupName(8)} lights in 3 minutes`);
        setTimeout(() => {
          req = { body: { lightNumber: 1, lightAction: 'off' } };
          lightsHelper.lightOnOff(req);
        }, turnOffIn);
      }
    }
  } catch (err) {
    serviceHelper.log('error', 'Middlehall - processData', err);
  }
};
