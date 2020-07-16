/**
 * Import external libraries
 */
const dateFormat = require('dateformat');

async function checkOffTimerIsActive(scheduleID) {
  let active = true;
  try {
    const sql = `SELECT name FROM light_schedules WHERE id = ${scheduleID} AND active`;
    this.logger.trace(
      `${this._traceStack()} - Connect to data store connection pool`,
    );
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Get list of active services`);
    const results = await dbConnection.query(sql);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) active = false;
    return active;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    return false;
  }
}

async function processData(sensor, lightGroupNumber) {
  const turnOffIn = 180000; // 3 minutes

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
    this.logger.trace(
      `${this._traceStack()} - Processing ${this.getLightGroupName.call(
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

    if (motion && lowLight) {
      this.logger.trace(`${this._traceStack()} - Motion and light activated`);
      const baseParams = { lightGroupNumber };
      const lightstate = await this.lightGroupState.call(this, {
        params: baseParams,
      });

      if (!lightstate.state.attributes.any_on) {
        let turnOffLightTimer = false;
        let results;

        try {
          const sql =
            'SELECT start_time, end_time, light_group_number, brightness, turn_off, scene FROM sensor_schedules WHERE active AND sensor_id = 1';
          this.logger.trace(
            `${this._traceStack()} - Connect to data store connection pool`,
          );
          const dbConnection = await this._connectToDB('lights');
          this.logger.trace(
            `${this._traceStack()} - Get list of active services`,
          );
          results = await dbConnection.query(sql);
          this.logger.trace(
            `${this._traceStack()} - Release the data store connection back to the pool`,
          );
          await dbConnection.end(); // Close data store connection
          if (results.rowCount === 0) {
            this.logger.trace(
              `${this._traceStack()} - No active light sensor settings`,
            );
            return;
          }

          // Decide what scene and brightness to use depending upon time of day
          this.logger.trace(
            `${this._traceStack()} - Decide what scene and brightness to use depending upon time of day`,
          );

          const currentTime = dateFormat(new Date(), 'HH:MM');

          results.rows.map(async (lightInfo) => {
            if (
              currentTime >= lightInfo.start_time &&
              currentTime <= lightInfo.end_time
            ) {
              this.logger.trace(
                `${this._traceStack()} - Found a schedule, so will turn on light group`,
              );
              this.logger.trace(
                `${this._traceStack()} - Figure out if lights require turning off`,
              );
              switch (lightInfo.turn_off) {
                case 'TRUE':
                  turnOffLightTimer = true;
                  break;
                case 'FALSE':
                  turnOffLightTimer = false;
                  break;
                default:
                  try {
                    turnOffLightTimer = await checkOffTimerIsActive.call(
                      this,
                      lightInfo.turn_off,
                    );
                  } catch (err) {
                    this.logger.error(`${this._traceStack()} - ${err.message}`);
                  }
              }

              this.logger.trace(
                `${this._traceStack()} - Construct the api call`,
              );
              const req = { params: baseParams };
              req.params.power = true;
              req.params.brightness = lightInfo.brightness;
              req.params.scene = lightInfo.scene;
              this.updateLightGroup.call(this, req);

              if (turnOffLightTimer) {
                // Schedule to turn off lights after 3 minutes
                this.logger.debug(
                  `${this._traceStack()} - Setting light group ${this.getLightGroupName.call(
                    this,
                    lightInfo.light_group_number,
                  )} timer to turn off in 3 minutes`,
                );
                setTimeout(() => {
                  req.params.power = false;
                  this.updateLightGroup.call(this, req);
                }, turnOffIn);
              }
            }
          });
        } catch (err) {
          this.logger.error(`${this._traceStack()} - ${err.message}`);
          return;
        }
      }
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

module.exports = {
  processData,
};
