/**
 * Front hall sensor
 */
const logger = require('winston');
const alfredHelper = require('../lib/helper.js');

let hallMotionSensorActive = true; // Make the hall sensor active

exports.processData = async function FnProcessData(sensor) {
  if (hallMotionSensorActive) { // Only process if the hall lights were not on
    let motion = false;
    let lowLight = false;
    const turnOffIn = 180000;

    // Check sensors
    try {
      sensor.data.forEach((sensorItem) => {
        if (sensorItem.attributes.attributes.id === '13') { // Motion sensor
          if (sensorItem.state.attributes.attributes.presence) motion = true;
        }
        if (sensorItem.attributes.attributes.id === '14') { // Ambient light sensor
          if (sensorItem.state.attributes.attributes.lightlevel <= sensorItem.config.attributes.attributes.tholddark) lowLight = true;
        }
      });
      if (motion && lowLight) {
        const lightstate = await alfredHelper.getAPIdata(`${process.env.alfred}lights/lightstate?light_number=13&scheduler=true`);
        if (!lightstate.data.on) {
          let body = { light_number: 7, light_status: 'on', brightness: 64 };
          alfredHelper.putAPIdata(`${process.env.alfred}lights/lightgrouponoff`, body);
          hallMotionSensorActive = false; // Turn off motion sensor as lights are on

          // Schedule to turn off lights after 3 minutes
          setTimeout(() => {
            body = { light_number: 7, light_status: 'off', brightness: 10 };
            alfredHelper.putAPIdata(`${process.env.alfred}lights/lightgrouponoff`, body);
            hallMotionSensorActive = true; // Re-activate motion sensor as lights are now off
          }, turnOffIn);
        }
      }
    } catch (err) {
      logger.error(`Front hall sensor - processData: ${err}`);
    }
  }
};

