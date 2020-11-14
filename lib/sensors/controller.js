/**
 * Import helper libraries
 */
const sensorMotion = require('./sensorMotion');

const pollingIntival = 2000; // 2 seconds

// Get sensor data
async function getSensorData() {
  this.logger.trace(`${this._traceStack()} - Get sensor data`);

  try {
    sensorMotion.processData.call(this, this.sensorData, '6'); // Middle hall sensor
    sensorMotion.processData.call(this, this.sensorData, '7'); // Front hall sensor
    sensorMotion.processData.call(this, this.sensorData, '8'); // Living room sensor
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

// Setup schedule function to run every few seconds
function activateSensors() {
  setTimeout(() => {
    getSensorData.call(this); // Get data from Hue hub and then process it
    activateSensors.call(this); // Recursive call back to this function
  }, pollingIntival);
}

module.exports = {
  activateSensors,
};
