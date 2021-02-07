/**
 * Import helper libraries
 */
const debug = require('debug')('Lights:DataCollector');

const poolingInterval = 15 * 60 * 1000; // 15 minutes

/**
 * Save data to data store
 */
async function saveDeviceData(device) {
  let dbConnection;

  debug(
    `Saving data: ${device.location} - Battery: ${device.battery}% (${device.device})`,
  );

  try {
    debug('Connect to DB');
    dbConnection = await this._connectToDB();

    debug(`Insert data`);
    const results = await dbConnection
      .db(this.namespace)
      .collection(this.namespace)
      .insertOne(device);

    if (results.insertedCount === 1)
      this.logger.info(`Saved data: ${device.location}`);
    else
      this.logger.error(
        `${this._traceStack()} - Failed to save data: ${device.location}`,
      );
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
}

/**
 * Process device data
 */
async function processData(sensor) {
  try {
    debug(`Getting data from: ${sensor.attributes.attributes.name}`);

    const sensorJSON = {
      time: new Date(),
      device: sensor.attributes.attributes.uniqueid,
      location: sensor.attributes.attributes.name,
      battery: sensor.config.attributes.attributes.battery,
      reachable: sensor.config.attributes.attributes.reachable,
    };

    await saveDeviceData.call(this, sensorJSON); // Save the device data
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
  return true;
}

async function _getDimmerDevices() {
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const sensor of this.dimmerData) {
      processData.call(this, sensor);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  setTimeout(() => {
    _getDimmerDevices.call(this);
  }, poolingInterval);
  return true;
}

module.exports = {
  _getDimmerDevices,
};
