/**
 * Import external libraries
 */
const dateFormat = require('dateformat');
const debug = require('debug')('Lights:Sensor_Motion');

async function processData(sensor, lightGroupNumber) {
  const turnOffIn = 3 * 60 * 1000; // 3 minutes

  let motion = false;
  let lowLight = false;
  let motionSensorID;
  let lightSensorID;

  switch (lightGroupNumber) {
    case '6':
      motionSensorID = '27';
      lightSensorID = '28';
      break;
    case '7':
      motionSensorID = '13';
      lightSensorID = '14';
      break;
    case '8':
      motionSensorID = '19';
      lightSensorID = '20';
      break;
    default:
      this.logger.error(
        `${this._traceStack()} - lightGroupNumber param was null`,
      );
      return;
  }

  // Check sensors
  try {
    debug(
      `Processing ${this.getLightGroupName.call(
        this,
        lightGroupNumber,
      )} sensor data`,
    );

    // Check motion and brightness
    sensor.map((sensorItem) => {
      if (sensorItem.attributes.attributes.id === motionSensorID) {
        // Motion sensor
        if (sensorItem.state.attributes.attributes.presence) motion = true;
      }
      if (sensorItem.attributes.attributes.id === lightSensorID) {
        // Ambient light sensor
        if (
          sensorItem.state.attributes.attributes.lightlevel <=
          sensorItem.config.attributes.attributes.tholddark
        )
          lowLight = true;
      }
      return true;
    });
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    return;
  }

  let dbConnection;
  if (motion && lowLight) {
    debug(
      `${this.getLightGroupName.call(
        this,
        lightGroupNumber,
      )} motion and light activated`,
    );

    // Check if light already on
    const lightGroup = this.lightGroupData.filter(
      (item) =>
        item.attributes.attributes.id.toString() ===
          lightGroupNumber.toString() && item.state.attributes.any_on === false,
    );

    if (lightGroup.length === 0) {
      debug(
        `${this.getLightGroupName.call(
          this,
          lightGroupNumber,
        )} light already on`,
      );
      return;
    }

    // Get schedules for sensor
    let results;
    try {
      const currentTime = dateFormat(new Date(), 'HH:MM');
      debug(`Connect to DB`);
      dbConnection = await this._connectToDB();

      debug(`Query DB`);
      const query = {
        active: true,
        lightGroup: Number(lightGroupNumber),
        startTime: { $lt: currentTime },
        endTime: { $gt: currentTime },
      };
      results = await dbConnection
        .db(this.namespace)
        .collection('sensor_schedules')
        .find(query)
        .toArray();

      if (results.length === 0) {
        // Exit function as no data to process
        this.logger.error(
          `${this._traceStack()} - No sensor schedules found for ${this.getLightGroupName.call(
            this,
            lightGroupNumber,
          )}`,
        );
        return;
      }
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

    try {
      // Turn on light group
      debug(`Construct lights on api call`);
      const req = { params: { lightGroupNumber } };
      req.params.power = true;
      req.params.brightness = results[0].brightness;
      req.params.scene = results[0].scene;
      this.updateLightGroup.call(this, req);

      // Check to see if it needs turning off
      if (results[0].turnOff) {
        // Schedule to turn off lights after 3 minutes
        debug(
          `Setting ${this.getLightGroupName.call(
            this,
            lightGroupNumber,
          )} timer to turn off in 3 minutes`,
        );

        setTimeout(() => {
          req.params.power = false;
          this.updateLightGroup.call(this, req);
        }, turnOffIn);
      }
    } catch (err) {
      this.logger.error(`${this._traceStack()} - ${err.message}`);
    }
  }
}

module.exports = {
  processData,
};
