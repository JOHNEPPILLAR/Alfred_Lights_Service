/**
 * Import external libraries
 */
const dateFormat = require('dateformat');

function lightsOn(data) {
  try {
    this.logger.trace(
      `${this._traceStack()} - Lights on schedule - Turning on ${data.name}`,
    );

    const req = {
      params: {
        lightGroupNumber: data.light_group_number,
        power: true,
        brightness: data.brightness,
        scene: data.scene,
        colorLoop: data.color_loop,
      },
    };

    const updateLights = this.updateLightGroup.call(this, req);
    if (updateLights instanceof Error) {
      throw new Error(`There was an error turning on light ${data.name}`);
    }
    return true;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    return false;
  }
}

async function setupSchedule(data) {
  if (data.hour === null || data.minute === null) {
    this.logger.error(`${this._traceStack()} - Schedule values were null`);
    return;
  }

  if (data.light_group_number === 4) {
    // 4 = Girls room
    this.logger.trace(`${this._traceStack()} - Check if girls are staying`);
    let kidsAtHomeToday = await this._kidsAtHomeToday();
    if (kidsAtHomeToday instanceof Error) kidsAtHomeToday = false;
    if (!kidsAtHomeToday) {
      this.logger.info(
        `Override ${data.name} on schedule: Girls are not staying`,
      );
      return;
    }
  }

  const date = new Date();
  if (data.ai_override) {
    this.logger.trace(`${this._traceStack()} - Getting sunset data`);
    const url = `${process.env.ALFRED_WEATHER_SERVICE}/sunset`;
    const sunsetData = await this._callAlfredServiceGet(url);
    if (sunsetData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${sunsetData.message}`);
      date.setHours(data.hour);
      date.setMinutes(data.minute);
    } else {
      const sunSet = new Date(`${'01/01/1900 '}${sunsetData.sunset}`);
      sunSet.setMinutes(sunSet.getMinutes() - 30);

      // If sunset < 5pm then reset to 5pm
      if (dateFormat(sunSet, 'HH:MM') < '17:00') {
        sunSet.setHours(17);
        sunSet.setMinutes(0);
      }
      date.setHours(sunSet.getHours());
      date.setMinutes(sunSet.getMinutes());
    }
  } else {
    date.setHours(data.hour);
    date.setMinutes(data.minute);
  }

  this.logger.trace(`${this._traceStack()} - Register tp-link schedule`);
  this.schedules.push({
    date,
    description: data.name,
    functionToCall: lightsOn,
    args: data,
  });
}

/**
 * Set up lights on schedules
 */
async function setup() {
  try {
    // Setup tp-link schedules
    this.logger.trace(`${this._traceStack()} - Setting up Schedules`);
    const sql =
      'SELECT name, hour, minute, light_group_number, brightness, scene, color_loop, ai_override FROM vw_lights_on_schedules';
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    const results = await dbConnection.query(sql);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      // Exit function as no data to process
      this.logger.info('No lights on timers are active');
      return false;
    }

    // Setup schedules
    await Promise.all(
      results.rows.map(async (info) => {
        await setupSchedule.call(this, info);
      }),
    );
    return true;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    return false;
  }
}

module.exports = {
  setup,
};
