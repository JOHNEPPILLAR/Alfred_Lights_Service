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
    serviceHelper.log('trace', 'Fronthall - processData', 'Processing sensor data');

    // Living room lights are off so check motion and brightness
    sensor.forEach((sensorItem) => {
      if (sensorItem.attributes.attributes.id === '13') { // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === '14') { // Ambient light sensor
        if (sensorItem.state.attributes.attributes.lightlevel <= sensorItem.config.attributes.attributes.tholddark) lowLight = true;
      }
    });

    if (motion && lowLight) {
      serviceHelper.log('trace', 'Fronthall - processData', 'Motion and light activated');

      req = { body: { lightGroupNumber: 7 } };
      const lightstate = await lightsHelper.lightGroupState(req);

      if (!lightstate.on) {
        let body;
        const currentTime = (dateFormat(new Date(), 'HH:MM'));

        let turnOffLightTimer = false;

        // Decide what scene and brightness to use depending upon time of day
        serviceHelper.log('trace', 'Fronthall - processData', 'Decide what scene and brightness to use depending upon time of day');

        // if current time > mid-night then show low light
        if (currentTime >= '00:00' && currentTime < '08:30') {
          body = {
            lightGroupNumber: 7, lightAction: 'on', brightness: 60,
          };
          turnOffLightTimer = true;
        }

        // if current time > 8:30am then show high light
        if (currentTime >= '08:30' && currentTime < '19:30') {
          body = {
            lightGroupNumber: 7, lightAction: 'on', brightness: 192,
          };
          turnOffLightTimer = true;
        }

        // if current time > 7:30pm then show low light
        if (currentTime >= '19:30' && currentTime < '00:00') {
          body = {
            lightGroupNumber: 7, lightAction: 'on', brightness: 60,
          };
          turnOffLightTimer = true;
        }

        req = { body };
        lightsHelper.lightGroupOnOff(req);

        if (turnOffLightTimer) { // Schedule to turn off lights after 3 minutes
          serviceHelper.log('trace', 'Fronthall - processData', `Setting timer to turn off ${serviceHelper.getLightGroupName(8)} lights in 3 minutes`);
          setTimeout(() => {
            req = { body: { lightGroupNumber: 7, lightAction: 'off' } };
            lightsHelper.lightGroupOnOff(req);
          }, turnOffIn);
        }
      }
    }
  } catch (err) {
    serviceHelper.log('error', 'Fronthall - processData', err);
  }
};
