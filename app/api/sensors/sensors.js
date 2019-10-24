/**
 * Import external libraries
 */
const hueBridge = require('huejay');
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

/**
 * Import mocks
 */
const motionMock = require('../../mock/motion.json');

const skill = new Skills();

// Setup Hue bridge
const { HueBridgeIP, HueBridgeUser } = process.env;
const hue = new hueBridge.Client({
  host: HueBridgeIP,
  username: HueBridgeUser,
  timeout: 15000, // Optional, timeout in milliseconds (15000 is the default)
});

/**
 * Hue sensor api's
 * {get} /sensors
 * {get} /sensors/timers
 * {get} /sensors/timers/rooms
 */

/**
 * @api {get} /sensors List all light groups
 * @apiName sensors
 * @apiGroup sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     data: [ all light groups ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function listSensors(req, res, next) {
  serviceHelper.log('trace', 'list all motion sensors API called');

  // Mock
  if (process.env.Mock === 'true') {
    serviceHelper.log('trace', 'Mock mode enabled');
    const returnJSON = motionMock;
    serviceHelper.log('trace', 'Return Mock');
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, returnJSON);
      next();
    } else {
      return returnJSON;
    }
  }

  // Non mock
  try {
    let hueData = await hue.sensors.getAll();
    serviceHelper.log(
      'trace',
      'Filter and only allow ZLLPresence and ZLLLightLevel in data',
    );
    hueData = hueData.filter(
      (o) => o.type === 'ZLLPresence' || o.type === 'ZLLLightLevel',
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, hueData);
      next();
    } else {
      return hueData;
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/sensors', listSensors);

/**
 * @api {get} /sensors/timers List all motion sensors timers
 * @apiName timers
 * @apiGroup Sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": [
 *       {
 *           "id": 1,
 *           "sensor_id": 1,
 *           "start_time": "00:00",
 *           "end_time": "08:30",
 *           "light_group_number": 7,
 *           "light_action": "on",
 *           "brightness": 40,
 *           "active": true,
 *           "turn_off": "TRUE",
 *           "scene": 3
 *       },
 *       ...
 *      ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function listSensorsTimers(req, res, next) {
  serviceHelper.log('trace', 'List all room sensors timers API called');

  try {
    const SQL = 'SELECT * FROM sensor_schedules ORDER BY id';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensors');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    // Send data back to caler
    serviceHelper.sendResponse(res, true, results.rows);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, null, err);
    next();
  }
  return true;
}
skill.get('/sensors/timers', listSensorsTimers);

/**
 * @api {get} /sensors/timers List sensor timer
 * @apiName timers
 * @apiGroup Sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": [
 *       {
 *           "id": 1,
 *           "sensor_id": 1,
 *           "start_time": "00:00",
 *           "end_time": "08:30",
 *           "light_group_number": 7,
 *           "light_action": "on",
 *           "brightness": 40,
 *           "active": true,
 *           "turn_off": "TRUE",
 *           "scene": 3
 *       },
 *       ...
 *      ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function listSensorTimer(req, res, next) {
  serviceHelper.log('trace', 'View sensor timer API called');

  const { sensorID } = req.params;

  try {
    const SQL = `SELECT * FROM sensor_schedules WHERE id = ${sensorID}`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensors');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    // Send data back to caler
    serviceHelper.sendResponse(res, true, results.rows);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err.message);
    next();
  }
  return true;
}
skill.get('/sensors/timers/:sensorID', listSensorTimer);

/**
 * @api {get} /sensors/timers/rooms List all sensor timers for a given room
 * @apiName rooms
 * @apiGroup Sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": [
 *       {
 *           "id": 1,
 *           "sensor_id": 1,
 *           "start_time": "00:00",
 *           "end_time": "08:30",
 *           "light_group_number": 7,
 *           "light_action": "on",
 *           "brightness": 40,
 *           "active": true,
 *           "turn_off": "TRUE",
 *           "scene": 3
 *       },
 *       ...
 *      ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function listSensorTimersRoom(req, res, next) {
  serviceHelper.log('trace', 'List sensor timers for a given room API called');

  const { roomNumber } = req.params;

  try {
    const SQL = `SELECT * FROM sensor_schedules WHERE light_group_number = ${roomNumber} ORDER BY id`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensors');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    // Send data back to caler
    serviceHelper.sendResponse(res, true, results.rows);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err.message);
    next();
  }
  return true;
}
skill.get('/sensors/timers/rooms/:roomNumber', listSensorTimersRoom);

// TODO

/**
 * @api {put} /sensors/save save schedule
 * @apiName save
 * @apiGroup Sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": {
 *       "saved": "true"
 *      }
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function saveSensors(req, res, next) {
  serviceHelper.log('trace', 'Save Schedule API called');

  let dbClient;
  let results;
  const {
    id,
    // eslint-disable-next-line camelcase
    start_time,
    // eslint-disable-next-line camelcase
    end_time,
    scene,
    brightness,
    active,
  } = req.body;

  try {
    // Update data in data store
    const SQL = 'UPDATE sensor_settings SET start_time = $2, end_time = $3, scene = $4, brightness = $5, active = $6 WHERE id = $1';
    // eslint-disable-next-line camelcase
    const SQLValues = [id, start_time, end_time, scene, brightness, active];

    serviceHelper.log('trace', 'Connect to data store connection pool');
    dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Save sensor');
    results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    // Send data back to caler
    if (results.rowCount === 1) {
      serviceHelper.log(
        'info',
        `Saved sensor data: ${JSON.stringify(req.body)}`,
      );
      serviceHelper.sendResponse(res, true, 'saved');
    } else {
      serviceHelper.log('error', 'Failed to save data');
      serviceHelper.sendResponse(res, false, 'failed to save');
    }
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, 'failed to save');
    next();
  }
  return true;
}
skill.put('/save', saveSensors);

module.exports = {
  skill,
  listSensors,
};