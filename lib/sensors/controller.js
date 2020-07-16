/**
 * Import helper libraries
 */
const sensorMotion = require('./sensorMotion');

const threeSeconds = 3000;
let timer = 3000;

// Get sensor data
async function getSensorData() {
  this.logger.debug(`${this._traceStack()} - Get sensor data`);

  try {
    const apiData = await this.sensors.call(this);
    sensorMotion.processData.call(this, apiData, '7'); // Front hall sensor
    sensorMotion.processData.call(this, apiData, '8'); // Living room sensor
    sensorMotion.processData.call(this, apiData, '6'); // Middle hall sensor

    // Check timer frequency
    if (timer > threeSeconds) {
      timer = threeSeconds; // Reset timer to back 3 seconds
      this.logger.debug(
        `${this._traceStack()} - Setting timer to ${timer / 1000} seconds`,
      );
    }
    return true;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (timer === threeSeconds) {
      timer *= 3; // Set timer to 9 seconds
      this.logger.debug(
        `${this._traceStack()} - Setting timer to ${timer / 1000} seconds`,
      );
    }
    return err;
  }
}

// Setup schedule function to run every few seconds
function activateSensors() {
  setTimeout(() => {
    getSensorData.call(this); // Get data from Hue hub and then process it
    activateSensors.call(this); // Recursive call back to this function
  }, timer);
}

module.exports = {
  activateSensors,
};
