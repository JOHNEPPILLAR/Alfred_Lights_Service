/**
 * Living room sensor
 */
const logger = require('winston');
const alfredHelper = require('../lib/helper.js');
const dateFormat = require('dateformat');

exports.processData = async function FnProcessData(sensor) {
  let motion = false;
  let lowLight = false;
  const turnOffIn = 180000;

  // Check sensors
  try {
    // Living room lights are off so check motion and brightness
    sensor.data.forEach((sensorItem) => {
      if (sensorItem.attributes.attributes.id === '19') { // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === '20') { // Ambient light sensor
        if (sensorItem.state.attributes.attributes.lightlevel <= sensorItem.config.attributes.attributes.tholddark) lowLight = true;
      }
    });

    if (motion && lowLight) {
      const lightstate = await alfredHelper.getAPIdata(`${process.env.alfred}lights/lightstate?light_number=2`);
      if (!lightstate.data.on) {
        let body;
        const currentTime = (dateFormat(new Date(), 'HH:MM'));

        let turnOffLightTimer = false;

        // Decide what scene and brightness to use depending upon time of day

        // if current time > mid-night then show low, read scene
        if (currentTime > '00:01' && currentTime < '06:29') {
          body = {
            light_number: 8, light_status: 'on', brightness: 64, ct: 348,
          };
          turnOffLightTimer = true;
        }

        // if current time > 6:30am then show mid, energise scene
        if (currentTime > '06:30' && currentTime < '08:29') {
          body = {
            light_number: 8, light_status: 'on', brightness: 128, ct: 156,
          };
          // TODO - check if morning lights off is not set then set turnOffLightTimer = true
        }

        // if current time > 8:31am then show high, concentrate scene
        if (currentTime > '08:31' && currentTime < '14.59') {
          body = {
            light_number: 8, light_status: 'on', brightness: 192, ct: 233,
          };
          turnOffLightTimer = true;
        }

        // if current time > 3pm then show high, concentrate scene
        if (currentTime > '15:00' && currentTime < '19.29') {
          body = {
            light_number: 8, light_status: 'on', brightness: 256, ct: 233,
          };
          // TODO - check if evening lights off is not set then set turnOffLightTimer = true
        }

        // if current time > 10pm then show low, read scene
        if (currentTime > '22:01' && currentTime < '23:59') {
          body = {
            light_number: 8, light_status: 'on', brightness: 64, ct: 348,
          };
          turnOffLightTimer = true;
        }

        // Call Alfred with payload
        alfredHelper.putAPIdata(`${process.env.alfred}lights/lightgrouponoff`, body);

        if (turnOffLightTimer) { // Schedule to turn off lights after 3 minutes
          setTimeout(() => {
            body = { light_number: 8, light_status: 'off' };
            alfredHelper.putAPIdata(`${process.env.alfred}lights/lightgrouponoff`, body);
          }, turnOffIn);
        }
      }
    }
  } catch (err) {
    logger.error(`Livingroom sensor - processData: ${err}`);
  }
};
