function allLightsOff() {
  try {
    this.logger.trace(
      `${this._traceStack()} - Lights off schedule - Turning off all lights`,
    );
    const req = {
      params: { lightGroupNumber: '0', power: false },
    };
    const updateLights = this.updateLightGroup.call(this, req);
    if (updateLights instanceof Error)
      throw new Error('There was an error turning off the lights');
    return true;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    return false;
  }
}

function setupSchedule(data) {
  this.logger.trace(
    `${this._traceStack()} - Create lights off schedule for ${data.name}`,
  );

  if (data.hour === null || data.minute === null) {
    this.logger.error(`${this._traceStack()} - Schedule values were null`);
    return false;
  }

  this.logger.trace(`${this._traceStack()} - Register lights off schedule`);
  this.schedules.push({
    hour: data.hour,
    minute: data.minute,
    description: data.name,
    functionToCall: allLightsOff,
  });
  return true;
}

/**
 * Set up lights off schedu;e
 */
async function setup() {
  try {
    // Get data from data store
    const sql =
      'SELECT name, hour, minute FROM light_schedules WHERE type = 0 AND active AND light_group_number = 0';
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    const results = await dbConnection.query(sql);
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
