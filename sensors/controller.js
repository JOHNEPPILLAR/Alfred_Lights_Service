const logger = require('winston');
const alfredHelper = require('../lib/helper.js');
const livingRoomSensor = require('./livingroom.js');
const frontHallSensor = require('./fronthall.js');
const middleHallSensor = require('./middlehall.js');

exports.setupSensors = async function FnSetupSensors() {
  const threeSeconds = 3000;
  let timer = threeSeconds;

  // Get metion sensor data
  async function getSensorData() {
    try {
      const apiData = await alfredHelper.getAPIdata(`${process.env.alfred}lights/lightmotion`);

      // Now process data
      livingRoomSensor.processData(apiData); // Living room sensor
      frontHallSensor.processData(apiData); // Front hall sensor
      middleHallSensor.processData(apiData); // Middle hall sensor

      // Check timer frequency
      if (timer > threeSeconds) {
        timer = threeSeconds; // Reset timer to back 3 seconds
        logger.info('Resetting the timer back to 3 seconds');
      }
    } catch (err) {
      logger.error(`getSensorData: ${err}`);
      if (timer === threeSeconds) {
        logger.info('Upping the timer to 60 seconds');
        timer = 60000; // Set timer to 60 seconds
      }
      return err;
    }
    return null;
  }

  // Setup timer function to run every 3 seconds
  function setMotionSensorSchedule() {
    setTimeout(() => {
      getSensorData(); // Get data from Hue hub and then process it
      setMotionSensorSchedule(); // Recursive call back to this function
    }, timer);
  }

  setMotionSensorSchedule();
};
