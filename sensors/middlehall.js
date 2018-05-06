/**
 * Middle hall sensor
 */
const logger = require('winston');
const alfredHelper = require('../lib/helper.js');
const dateFormat = require('dateformat');

let middleHallMotionSensorActive = true; // Make the middle hall sensor active

exports.processData = async function FnProcessData(sensor) {
  if (middleHallMotionSensorActive) { // Only process if the hall lights were not on
    let motion = false;
    let lowLight = false;
    const turnOffIn = 180000;

    // Check sensors
    try {
      sensor.data.forEach((sensorItem) => {
        if (sensorItem.attributes.attributes.id === '27') { // Motion sensor
          if (sensorItem.state.attributes.attributes.presence) motion = true;
        }
        if (sensorItem.attributes.attributes.id === '28') { // Ambient light sensor
          if (sensorItem.state.attributes.attributes.lightlevel <= sensorItem.config.attributes.attributes.tholddark) lowLight = true;
        }
      });

      if (motion && lowLight) {
        const lightstate = await alfredHelper.getAPIdata(`${process.env.alfred}lights/lightstate?light_number=1&scheduler=true`);
        if (!lightstate.data.on) {
          let body;

          const currentTime = (dateFormat(new Date(), 'HH:MM'));

          // Decide what scene and brightness to use depending upon time of day

          // if current time > mid-night then show low, read scene
          if (currentTime > '00:01' && currentTime < '05:59') {
            body = {
              light_number: 1, light_status: 'on', brightness: 64, ct: 348,
            };
          }

          // if current time > 6am then show mid, energise scene
          if (currentTime > '06:00' && currentTime < '14:59') {
            body = {
              light_number: 1, light_status: 'on', brightness: 128, ct: 156,
            };
            // TODO - check if morning lights off is not set then set turnOffLightTimer = true
          }

          // if current time > 3pm then show high, concentrate scene
          if (currentTime > '15:00' && currentTime < '19.29') {
            body = {
              light_number: 1, light_status: 'on', brightness: 192, ct: 233,
            };
            // TODO - check if evening lights off is not set then set turnOffLightTimer = true
          }

          // if current time > 7:30pm then show mid, energise scene
          if (currentTime > '19:30' && currentTime < '21:59') {
            body = {
              light_number: 1, light_status: 'on', brightness: 128, ct: 156,
            };
            // TODO - check if morning lights off is not set then set turnOffLightTimer = true
          }

          // if current time > 10pm then show low, read scene
          if (currentTime > '22:00' && currentTime < '23:59') {
            body = {
              light_number: 1, light_status: 'on', brightness: 64, ct: 348,
            };
          }

          alfredHelper.putAPIdata(`${process.env.alfred}lights/lightonoff`, body);
          middleHallMotionSensorActive = false; // Turn off motion sensor as lights are on

          // Schedule to turn off lights after 3 minutes
          setTimeout(() => {
            body = { light_number: 1, light_status: 'off', brightness: 10 };
            alfredHelper.putAPIdata(`${process.env.alfred}lights/lightonoff`, body);
            middleHallMotionSensorActive = true; // Re-activate motion sensor as lights are now off
          }, turnOffIn);
        }
      }
    } catch (err) {
      logger.error(`Middle hall sensor - processData: ${err}`);
    }
  }
};

