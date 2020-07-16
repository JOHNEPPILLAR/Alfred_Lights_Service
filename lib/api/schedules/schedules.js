// Import Schemas
const scheduleSchema = require('../../schemas/schedule.json');

/**
 * @type get
 * @path /schedules/rooms/:roomNumber
 */
async function listSchedulesRoom(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - List schedules for a given room API called`,
  );

  const { roomNumber } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(roomNumber)) {
    const err = new Error('param: roomNumber is not a number');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
      next();
    }
    return err;
  }

  try {
    const sql = `SELECT * FROM light_schedules WHERE light_group_number = ${roomNumber} ORDER BY id`;
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
 * @type put
 * @path /schedules/:scheduleID
 */
async function listSchedule(req, res, next) {
  this.logger.debug(`${this._traceStack()} - View schedule API called`);

  const { scheduleID } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(scheduleID)) {
    const err = new Error('param: scheduleID is not a number');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
    }
    return err;
  }

  try {
    const sql = `SELECT * FROM light_schedules WHERE id = ${scheduleID}`;
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
    }
    return err;
  }
  return true;
}

/**
 * @type put
 * @path /schedules/:scheduleID
 */
async function saveSchedule(req, res, next) {
  this.logger.debug(`${this._traceStack()} - Update Schedule API called`);

  const {
    id,
    type,
    name,
    hour,
    minute,
    aiOverride,
    active,
    lightGroupNumber,
    brightness,
    scene,
    colorLoop,
  } = req.params;

  this.logger.trace(`${this._traceStack()} - Check for valid params`);
  const validSchema = this._validateSchema(req, scheduleSchema);
  if (validSchema !== true) {
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, validSchema);
    }
    return validSchema;
  }

  try {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(id)) {
      const err = new Error('param: ID is not a number');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 400, err);
      }
      return err;
    }

    const scheduleData = await listSchedule.call(
      this,
      { params: { scheduleID: id } },
      null,
      null,
    );
    if (scheduleData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${scheduleData.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, scheduleData);
      } else {
        return scheduleData;
      }
    }

    this.logger.trace(`${this._traceStack()} - Update values from params`);

    if (typeof type !== 'undefined' && type !== null)
      scheduleData[0].type = type;
    if (typeof name !== 'undefined' && name !== null)
      scheduleData[0].name = name;
    if (typeof hour !== 'undefined' && hour !== null)
      scheduleData[0].hour = hour;
    if (typeof minute !== 'undefined' && minute !== null)
      scheduleData[0].minute = minute;
    if (typeof aiOverride !== 'undefined' && aiOverride !== null)
      scheduleData[0].ai_override = aiOverride;
    if (typeof active !== 'undefined' && active !== null)
      scheduleData[0].active = active;
    if (typeof lightGroupNumber !== 'undefined' && lightGroupNumber !== null)
      scheduleData[0].light_group_number = lightGroupNumber;
    if (typeof brightness !== 'undefined' && brightness !== null)
      scheduleData[0].brightness = brightness;
    if (typeof scene !== 'undefined' && scene !== null)
      scheduleData[0].scene = scene;
    if (typeof colorLoop !== 'undefined' && colorLoop !== null)
      scheduleData[0].color_loop = colorLoop;

    this.logger.trace(`${this._traceStack()} - Update db`);

    // Update data in data store
    const sql =
      'UPDATE light_schedules SET type=$2, name=$3, hour=$4, minute=$5, ai_override=$6, active=$7, light_group_number=$8, brightness=$9, scene=$10, color_loop=$11 WHERE id = $1';
    const sqlValues = [
      id,
      scheduleData[0].type,
      scheduleData[0].name,
      scheduleData[0].hour,
      scheduleData[0].minute,
      scheduleData[0].ai_override,
      scheduleData[0].active,
      scheduleData[0].light_group_number,
      scheduleData[0].brightness,
      scheduleData[0].scene,
      scheduleData[0].color_loop,
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
      this.logger.info(`Saved schedule data: ${JSON.stringify(req.params)}`);

      this.logger.info('Reseting schedules');
      await this.setupSchedules();
      await this.activateSchedules();

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
  listSchedulesRoom,
  listSchedule,
  saveSchedule,
};
