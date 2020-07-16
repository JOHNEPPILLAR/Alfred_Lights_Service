// Import Schemas
const sensorScheduleSchema = require('../../schemas/sensor_schedule.json');

/**
 * @type get
 * @path /sensors
 */
async function sensors(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - List all motion sensors API called`,
  );

  try {
    let hueData = await this.hue.sensors.getAll();
    this.logger.trace(
      `${this._traceStack()} - Filter and only allow ZLLPresence and ZLLLightLevel in data`,
    );
    hueData = hueData.filter(
      (o) => o.type === 'ZLLPresence' || o.type === 'ZLLLightLevel',
    );
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, hueData);
    } else {
      return hueData;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    } else {
      return err;
    }
  }
  return true;
}

/**
 * @type get
 * @path /sensors/schedules
 */
async function listSensorsSchedules(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - List all room sensors schedules API called`,
  );

  try {
    const sql = 'SELECT * FROM sensor_schedules ORDER BY id';
    this.logger.trace(`${this._traceStack()} - Connect to db`);
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    const results = await dbConnection.query(sql);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection
    this._sendResponse(res, next, 200, results.rows);
    return true;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  }
}

/**
 * @type get
 * @path /sensors/schedules/:ID
 */
async function listSensorSchedule(req, res, next) {
  this.logger.debug(`${this._traceStack()} - View sensor schedule API called`);

  const { sensorID } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(sensorID)) {
    const err = new Error('param: sensorID is not a number');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
    }
    return err;
  }

  try {
    const sql = `SELECT * FROM sensor_schedules WHERE id = ${sensorID}`;
    this.logger.trace(`${this._traceStack()} - Connect to db`);
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    const results = await dbConnection.query(sql);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results.rows);
    } else {
      return results.rows;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
    return err;
  }
  return true;
}

/**
 * @type get
 * @path /sensors/schedules/rooms/:roomNumber
 */
async function listSensorSchedulesRoom(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - List sensor schedules for a given room API called`,
  );

  const { roomNumber } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(roomNumber)) {
    const err = new Error('param: roomNumber is not a number');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
    }
    return err;
  }

  try {
    const sql = `SELECT * FROM sensor_schedules WHERE light_group_number = ${roomNumber} ORDER BY id`;
    this.logger.trace(`${this._traceStack()} - Connect to db`);
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    const results = await dbConnection.query(sql);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results.rows);
    } else {
      return results.rows;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    } else {
      return err;
    }
  }
  return true;
}

/**
 * @type put
 * @path /sensors/schedules/:sensorID
 */
async function saveSensors(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - Update sensor schedule API called`,
  );

  const {
    id,
    sensorID,
    startTime,
    endTime,
    lightGroupNumber,
    brightness,
    active,
    turnOff,
    scene,
  } = req.params;

  this.logger.trace(`${this._traceStack()} - Check for valid params`);
  const validSchema = this._validateSchema(req, sensorScheduleSchema);
  if (validSchema !== true) {
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, validSchema);
    }
    return validSchema;
  }

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

    const sensorData = await listSensorSchedule.call(
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

    if (typeof sensorID !== 'undefined' && sensorID !== null)
      sensorData[0].sensor_id = sensorID;
    if (typeof startTime !== 'undefined' && startTime !== null)
      sensorData[0].start_time = startTime;
    if (typeof endTime !== 'undefined' && endTime !== null)
      sensorData[0].end_time = endTime;
    if (typeof lightGroupNumber !== 'undefined' && lightGroupNumber !== null)
      sensorData[0].light_group_number = lightGroupNumber;
    if (typeof brightness !== 'undefined' && brightness !== null)
      sensorData[0].brightness = brightness;
    if (typeof active !== 'undefined' && active !== null)
      sensorData[0].active = active;
    if (typeof turnOff !== 'undefined' && turnOff !== null)
      sensorData[0].turn_off = turnOff;
    if (typeof scene !== 'undefined' && scene !== null)
      sensorData[0].scene = scene;

    this.logger.trace(`${this._traceStack()} - Update db`);

    const sql =
      'UPDATE sensor_schedules SET sensor_id = $2, start_time = $3, end_time = $4, light_group_number = $5, brightness = $6, active = $7, turn_off = $8, scene = $9 WHERE id = $1';
    const sqlValues = [
      id,
      sensorData[0].sensor_id,
      sensorData[0].start_time,
      sensorData[0].end_time,
      sensorData[0].light_group_number,
      sensorData[0].brightness,
      sensorData[0].active,
      sensorData[0].turn_off,
      scene,
    ];

    this.logger.trace(`${this._traceStack()} - Connect to db`);
    const dbConnection = await this._connectToDB('lights');
    this.logger.trace(`${this._traceStack()} - Execute sql`);
    const results = await dbConnection.query(sql, sqlValues);
    this.logger.trace(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    if (results.rowCount === 1) {
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
  }
  return true;
}

module.exports = {
  sensors,
  listSensorsSchedules,
  listSensorSchedule,
  listSensorSchedulesRoom,
  saveSensors,
};
