/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

/**
 * Import mocks
 */
const motionMock = require('../../mock/motion.json');

const skill = new Skills();
const sensorScheduleSchema = require('../../schemas/sensor_schedule.json');

/**
 * @type get
 * @path /sensors
 */
async function listSensors(req, res, next) {
  serviceHelper.log(
    'trace',
    'list all motion sensors API called',
  );

  // Mock
  if (process.env.MOCK === 'true') {
    serviceHelper.log(
      'trace',
      'Mock mode enabled',
    );
    const returnJSON = motionMock;
    serviceHelper.log(
      'trace',
      'Return Mock',
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        returnJSON,
      );
      next();
    }
    return returnJSON;
  }

  // Non mock
  try {
    let hueData = await global.hue.sensors.getAll();
    serviceHelper.log(
      'trace',
      'Filter and only allow ZLLPresence and ZLLLightLevel in data',
    );
    hueData = hueData.filter(
      (o) => o.type === 'ZLLPresence' || o.type === 'ZLLLightLevel',
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        hueData,
      );
      next();
    } else {
      return hueData;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get(
  '/sensors',
  listSensors,
);

/**
 * @type get
 * @path /sensors/schedules
 */
async function listSensorsSchedules(req, res, next) {
  serviceHelper.log(
    'trace',
    'List all room sensors schedules API called',
  );

  try {
    const SQL = 'SELECT * FROM sensor_schedules ORDER BY id';
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log(
      'trace',
      'Get sensors',
    );
    const results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    serviceHelper.sendResponse(
      res,
      200,
      results.rows,
    );
    next();
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    serviceHelper.sendResponse(
      res,
      500,
      err,
    );
    next();
  }
  return true;
}
skill.get(
  '/sensors/schedules',
  listSensorsSchedules,
);

/**
 * @type get
 * @path /sensors/schedules/:ID
 */
async function listSensorSchedule(req, res, next) {
  serviceHelper.log(
    'trace',
    'View sensor schedule API called',
  );

  const { ID } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(ID)) {
    const err = new Error('param: ID is not a number');
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        400,
        err,
      );
      next();
    }
    return err;
  }

  try {
    const SQL = `SELECT * FROM sensor_schedules WHERE id = ${ID}`;
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log(
      'trace',
      'Get sensors',
    );
    const results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        results.rows,
      );
      next();
    } else {
      return results.rows;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err.message,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get(
  '/sensors/schedules/:sensorID',
  listSensorSchedule,
);

/**
 * @type get
 * @path /sensors/schedules/rooms/:roomNumber
 */
async function listSensorSchedulesRoom(req, res, next) {
  serviceHelper.log(
    'trace',
    'List sensor schedules for a given room API called',
  );

  const { roomNumber } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(roomNumber)) {
    const err = new Error('param: roomNumber is not a number');
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        400,
        err,
      );
      next();
    }
    return err;
  }

  try {
    const SQL = `SELECT * FROM sensor_schedules WHERE light_group_number = ${roomNumber} ORDER BY id`;
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log(
      'trace',
      'Get sensors',
    );
    const results = await dbConnection.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        results.rows,
      );
      next();
    } else {
      return results.rows;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err.message,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get(
  '/sensors/schedules/rooms/:roomNumber',
  listSensorSchedulesRoom,
);

/**
 * @type put
 * @path /sensors/schedules/:sensorID
 */
async function saveSensors(req, res, next) {
  serviceHelper.log(
    'trace',
    'Update Schedule API called',
  );

  const {
    ID,
    sensorID,
    startTime,
    endTime,
    lightGroupNumber,
    brightness,
    active,
    turnOff,
    scene,
  } = req.params;

  try {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(ID)) {
      const err = new Error('param: ID is not a number');
      serviceHelper.log(
        'error',
        err.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          400,
          err,
        );
        next();
      }
      return err;
    }

    const sensorData = await listSensorSchedule({ params: { ID } }, null, null);
    if (sensorData instanceof Error) {
      serviceHelper.log(
        'error',
        sensorData.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          sensorData,
        );
        next();
      } else {
        return sensorData;
      }
    }

    serviceHelper.log(
      'trace',
      'Update values from params',
    );

    if (typeof sensorID !== 'undefined' && sensorID !== null) sensorData[0].sensor_id = sensorID;
    if (typeof startTime !== 'undefined' && startTime !== null) sensorData[0].start_time = startTime;
    if (typeof endTime !== 'undefined' && endTime !== null) sensorData[0].end_time = endTime;
    if (typeof lightGroupNumber !== 'undefined' && lightGroupNumber !== null) sensorData[0].light_group_number = lightGroupNumber;
    if (typeof brightness !== 'undefined' && brightness !== null) sensorData[0].brightness = brightness;
    if (typeof active !== 'undefined' && active !== null) sensorData[0].active = active;
    if (typeof turnOff !== 'undefined' && turnOff !== null) sensorData[0].turn_off = turnOff;
    if (typeof scene !== 'undefined' && scene !== null) sensorData[0].scene = scene;

    serviceHelper.log(
      'trace',
      'Update db',
    );

    const SQL = 'UPDATE sensor_schedules SET sensor_id = $2, start_time = $3, end_time = $4, light_group_number = $5, brightness = $6, active = $7, turn_off = $8, scene = $9 WHERE id = $1';
    const SQLValues = [
      ID,
      sensorData[0].sensor_id,
      sensorData[0].start_time,
      sensorData[0].end_time,
      sensorData[0].light_group_number,
      sensorData[0].brightness,
      sensorData[0].active,
      sensorData[0].turn_off,
      scene,
    ];

    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log(
      'trace',
      'Save sensor schedule',
    );
    const results = await dbConnection.query(
      SQL,
      SQLValues,
    );
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection

    // Send data back to caler
    if (results.rowCount === 1) {
      serviceHelper.log(
        'info',
        `Saved sensor data: ${JSON.stringify(req.params)}`,
      );

      serviceHelper.sendResponse(
        res,
        200,
        '{ state: saved }',
      );
    } else {
      const err = new Error('Failed to save');
      serviceHelper.log(
        'error',
        err.message,
      );
      serviceHelper.sendResponse(
        res,
        500,
        err.message,
      );
    }
    next();
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    serviceHelper.sendResponse(
      res,
      500,
      err,
    );
    next();
  }
  return true;
}
skill.put(
  '/sensors/schedules/:ID',
  serviceHelper.validateSchema(sensorScheduleSchema),
  saveSensors,
);

module.exports = {
  skill,
  listSensors,
};
