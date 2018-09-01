/**
 * Import external libraries
 */
const serviceHelper = require('../lib/helper.js');
const lightsHelper = require('../api/lights/lights.js');

const livingRoomSensor = require('./livingroom.js');
const frontHallSensor = require('./fronthall.js');
const middleHallSensor = require('./middlehall.js');

const threeSeconds = 3000;
let timer = 3000;

// Process sensor data
async function processSensorData(apiData) {
  livingRoomSensor.processData(apiData); // Living room sensor
  //frontHallSensor.processData(apiData); // Front hall sensor
  //middleHallSensor.processData(apiData); // Middle hall sensor
}

// Get sensor data
async function getSensorData() {
  serviceHelper.log('trace', 'getSensorData', 'Get sensor data');
  try {
    const apiData = await lightsHelper.lightMotion();
    processSensorData(apiData);

    // Check timer frequency
    if (timer > threeSeconds) {
      timer = threeSeconds; // Reset timer to back 3 seconds
      serviceHelper.log('info', 'getSensorData', `Setting timer to ${timer / 1000} seconds`);
    }
  } catch (err) {
    serviceHelper.log('error', 'getSensorData', err);
    if (timer === threeSeconds) {
      timer *= 3; // Set timer to 9 seconds
      serviceHelper.log('info', 'getSensorData', `Setting timer to ${timer / 1000} seconds`);
    }
    return err;
  }
  return null;
}

// Setup timer function to run every x seconds
function setup() {
  setTimeout(() => {
    getSensorData(); // Get data from Hue hub and then process it
    setup(); // Recursive call back to this function
  }, timer);
}

exports.setup = () => {
  setup();
};
