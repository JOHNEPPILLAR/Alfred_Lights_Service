/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const sensorHelper = require('../api/sensors/sensors.js');
const livingRoomSensor = require('./living-room.js');
const frontHallSensor = require('./front-hall.js');
const middleHallSensor = require('./middle-hall.js');

const threeSeconds = 3000;
let timer = 3000;

// Get sensor data
async function getSensorData() {
  serviceHelper.log(
    'trace',
    'Get sensor data',
  );
  try {
    const apiData = await sensorHelper.listSensors();
    livingRoomSensor.processData(apiData); // Living room sensor
    frontHallSensor.processData(apiData); // Front hall sensor
    middleHallSensor.processData(apiData); // Middle hall sensor

    // Check timer frequency
    if (timer > threeSeconds) {
      timer = threeSeconds; // Reset timer to back 3 seconds
      serviceHelper.log(
        'info',
        `Setting timer to ${timer / 1000} seconds`,
      );
    }
    return true;
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (timer === threeSeconds) {
      timer *= 3; // Set timer to 9 seconds
      serviceHelper.log(
        'info',
        `Setting timer to ${timer / 1000} seconds`,
      );
    }
    return err;
  }
}

// Setup schedule function to run every few seconds
function setup() {
  setTimeout(() => {
    getSensorData(); // Get data from Hue hub and then process it
    setup(); // Recursive call back to this function
  }, timer);
}

exports.setup = () => setup();
