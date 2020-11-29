/**
 * Import external libraries
 */
const dateFormat = require('dateformat');

async function setupSchedule(schedule) {
  this.logger.trace(
    `${this._traceStack()} - Create light schedule for ${schedule.description}`,
  );

  if (schedule.lightGroup === 4) {
    // Girls room
    this.logger.trace(`${this._traceStack()} - Check if girls are staying`);
    let kidsAtHomeToday = await this._kidsAtHomeToday();
    if (kidsAtHomeToday instanceof Error) kidsAtHomeToday = false;
    if (!kidsAtHomeToday) {
      this.logger.info(
        `Override ${schedule.description} on schedule: Girls are not staying`,
      );
      return;
    }
  }

  this.logger.trace(`${this._traceStack()} - Set time part of the schedule`);
  const date = new Date();
  date.setHours(schedule.hour);
  date.setMinutes(schedule.minute);

  if (schedule.sunriseOverride) {
    try {
      this.logger.trace(`${this._traceStack()} - Getting sunrise data`);
      const url = `${process.env.ALFRED_WEATHER_SERVICE}/sunrise`;
      const weatherData = await this._callAlfredServiceGet(url);
      const sunRise = new Date(`${'01/01/1900 '}${weatherData.time}`);
      date.setHours(sunRise.getHours());
      date.setMinutes(sunRise.getMinutes());
    } catch (err) {
      this.logger.error(
        `${this._traceStack()} - Error getting sunrise, using schedule values`,
      );
    }
  }

  if (schedule.sunsetOverride) {
    try {
      this.logger.trace(`${this._traceStack()} - Getting sunset data`);
      const url = `${process.env.ALFRED_WEATHER_SERVICE}/sunset`;
      const weatherData = await this._callAlfredServiceGet(url);
      const sunSet = new Date(`${'01/01/1900 '}${weatherData.time}`);
      sunSet.setMinutes(sunSet.getMinutes() - 30);

      // If sunset < 5pm then reset to 5pm
      if (dateFormat(sunSet, 'HH:MM') < '17:00') {
        sunSet.setHours(17);
        sunSet.setMinutes(0);
      }

      date.setHours(sunSet.getHours());
      date.setMinutes(sunSet.getMinutes());
    } catch (err) {
      this.logger.error(
        `${this._traceStack()} - Error getting sunset, using schedule values`,
      );
    }
  }

  this.logger.trace(`${this._traceStack()} - Set light change paramaters`);
  const req = {
    params: {
      lightGroupNumber: `${schedule.lightGroup}`,
      power: schedule.on,
    },
  };
  if (schedule.brightness) req.params.brightness = schedule.brightness;
  if (schedule.colorLoop) req.params.colorLoop = schedule.colorLoop;
  if (schedule.scene != null) req.params.scene = schedule.scene;

  this.logger.trace(`${this._traceStack()} - Register lights schedule`);
  this.schedules.push({
    hour: schedule.hour,
    minute: schedule.minute,
    description: schedule.description,
    functionToCall: this.updateLightGroup,
    args: req,
  });
}

/**
 * Set up lights schedules
 */
async function setup() {
  let dbConnection;
  try {
    // Get data from data store
    dbConnection = await this._connectToDB();
    const query = { active: true };
    const results = await dbConnection
      .db(this.namespace)
      .collection('schedules')
      .find(query)
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      this.logger.info('No light schedules are active');
      return;
    }

    // Setup schedules
    await Promise.all(
      results.map(async (schedule) => {
        await setupSchedule.call(this, schedule);
      }),
    );
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  } finally {
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
}

module.exports = {
  setup,
};
