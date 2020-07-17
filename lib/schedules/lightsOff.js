function lightsOff(data) {
  try {
    this.logger.trace(
      `${this._traceStack()} - Lights off schedule - Turning off ${data.name}`,
    );

    const req = {
      params: {
        lightGroupNumber: data.light_group_number,
        power: false,
      },
    };

    const updateLights = this.updateLightGroup.call(this, req);
    if (updateLights instanceof Error)
      throw new Error(`There was an error turning off light ${data.name}`);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

async function setupSchedule(data) {
  this.logger.trace(
    `${this._traceStack()} - Create lights off schedule for ${data.name}`,
  );

  if (data.hour === null || data.minute === null) {
    this.logger.error(`${this._traceStack()} - Schedule values were null`);
    return false;
  }

  const date = new Date();
  if (data.ai_override) {
    this.logger.trace(`${this._traceStack()} - Static time override enabled`);
    this.logger.trace(`${this._traceStack()} - Getting sunrise data`);
    const url = `${process.env.ALFRED_WEATHER_SERVICE}/sunrise`;
    const sunsetData = await this._callAlfredServiceGet.call(this, url);
    if (sunsetData instanceof Error) {
      this.logger.error(
        `${this._traceStack()} - Error getting sunrise, so setting default override values`,
      );
      date.setHours(data.hour);
      date.setMinutes(data.minute);
    } else {
      const sunSet = new Date(`${'01/01/1900 '}${sunsetData.sunrise}`);
      sunSet.setMinutes(sunSet.getMinutes() - 30);
      date.setHours(sunSet.getHours());
      date.setMinutes(sunSet.getMinutes());
    }
  } else {
    this.logger.trace(`${this._traceStack()} - Using time from db`);
    date.setHours(data.hour);
    date.setMinutes(data.minute);
  }

  this.logger.trace(`${this._traceStack()} - Register ${data.name} schedule`);
  this.schedules.push({
    date,
    description: data.name,
    functionToCall: lightsOff,
    args: data,
  });
  return true;
}

/**
 * Set up lights off schedules
 */
async function setup() {
  let results;

  try {
    // Get data from data store
    const sql =
      'SELECT name, hour, minute, light_group_number, brightness, scene, color_loop, ai_override FROM light_schedules WHERE type = 2';
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    results = await dbConnection.query(sql);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      // Exit function as no data to process
      this.logger.info('No lights off schedules are active');
      return;
    }

    // Setup schedules
    await Promise.all(
      results.rows.map(async (info) => {
        await setupSchedule.call(this, info);
      }),
    );
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

module.exports = {
  setup,
};
