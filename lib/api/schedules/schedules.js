// Import Schemas
const sensorScheduleSchema = require('../../schemas/sensor_schedule.json');

/**
 * @type get
 * @path /schedules
 */
async function listSchedules(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - List all sensor schedules API called`,
  );

  let dbConnection;
  try {
    dbConnection = await this._connectToDB();
    this.logger.trace(`${this._traceStack()} - Execute query`);
    const query = {};
    const results = await dbConnection
      .db(this.namespace)
      .collection('sensor_schedules')
      .find(query)
      .toArray();

    this._sendResponse(res, next, 200, results);
    return true;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  } finally {
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
}

/**
 * @type get
 * @path /schedules/:ID
 */
async function listSchedule(req, res, next) {
  this.logger.debug(`${this._traceStack()} - View sensor schedule API called`);

  const { ID } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(ID)) {
    const err = new Error('param: sensorID is not a number');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
    }
    return err;
  }

  let dbConnection;
  try {
    this.logger.trace(`${this._traceStack()} - Execute query`);
    const query = { id: Number(ID) };
    dbConnection = await this._connectToDB();
    const results = await dbConnection
      .db(this.namespace)
      .collection('sensor_schedules')
      .find(query)
      .toArray();

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    }
    return results;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  } finally {
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
}

/**
 * @type put
 * @path /schedules/:sensorID
 */
async function saveSensors(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - Update sensor schedule API called`,
  );

  const {
    id,
    startTime,
    endTime,
    lightGroupNumber,
    brightness,
    scene,
    active,
  } = req.params;

  this.logger.trace(`${this._traceStack()} - Check for valid params`);
  const validSchema = this._validateSchema(req, sensorScheduleSchema);
  if (validSchema !== true) {
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, validSchema);
    }
    return validSchema;
  }

  let dbConnection;
  try {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(id)) {
      const err = new Error('param: id is not a number');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 400, err);
      }
      return err;
    }

    const sensorData = await listSchedule.call(
      this,
      { params: { sensorID: id } },
      null,
      null,
    );
    if (sensorData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${sensorData.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, sensorData);
      } else {
        return sensorData;
      }
    }

    this.logger.trace(`${this._traceStack()} - Update values from params`);

    const newValues = { $set: {} };
    if (typeof lightGroupNumber !== 'undefined' && lightGroupNumber !== null)
      newValues.$set.lightGroup = lightGroupNumber;
    if (typeof startTime !== 'undefined' && startTime !== null)
      newValues.$set.startTime = startTime;
    if (typeof endTime !== 'undefined' && endTime !== null)
      newValues.$set.endTime = endTime;
    if (typeof brightness !== 'undefined' && brightness !== null)
      newValues.$set.brightness = brightness;
    if (typeof scene !== 'undefined' && scene !== null)
      newValues.$set.scene = scene;
    if (typeof active !== 'undefined' && active !== null)
      newValues.$set.active = active;

    this.logger.trace(`${this._traceStack()} - Update db`);
    const query = { _id: sensorData[0]._id };
    const opts = {
      returnOriginal: false,
      upsert: true,
    };

    dbConnection = await this._connectToDB();
    const results = await dbConnection
      .db(this.namespace)
      .collection('sensor_schedules')
      .findOneAndUpdate(query, newValues, opts);

    if (results.ok === 1) {
      this.logger.info(`Saved sensor data: ${JSON.stringify(req.params)}`);
      this._sendResponse(res, next, 200, { state: 'saved' });
    } else {
      const err = new Error('Failed to save');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, err);
      }
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
  return true;
}

module.exports = {
  listSchedules,
  listSchedule,
  saveSensors,
};
