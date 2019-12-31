/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

const skill = new Skills();

/**
 * Import helper libraries
 */
const schedules = require('../../schedules/controller.js');

/**
 * @api {get} /schedules/rooms List all schedules for a given room
 * @apiName rooms
 * @apiGroup Sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": [
 *       {
 *           "id": 3,
 *           "type": 1,
 *           "name": "Kids room bedtime light",
 *           "hour": 17,
 *           "minute": 0,
 *           "ai_override": true,
 *           "active": true,
 *           "light_group_number": 4,
 *           "brightness": 250,
 *           "scene": null,
 *           "color_loop": true
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
async function listSchedulesRoom(req, res, next) {
  serviceHelper.log('trace', 'List schedules for a given room API called');

  const { roomNumber } = req.params;

  try {
    const SQL = `SELECT * FROM light_schedules WHERE light_group_number = ${roomNumber} ORDER BY id`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('lights');
    const dbClient = await dbConnection.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensors');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool
    await dbClient.end(); // Close data store connection

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
skill.get('/schedules/rooms/:roomNumber', listSchedulesRoom);

/**
 * @api {get} /schedules List schedule
 * @apiName schedules
 * @apiGroup schedules
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": [
 *       {
 *           "id": 3,
 *           "type": 1,
 *           "name": "Kids room bedtime light",
 *           "hour": 17,
 *           "minute": 0,
 *           "ai_override": true,
 *           "active": true,
 *           "light_group_number": 4,
 *           "brightness": 250,
 *           "scene": null,
 *           "color_loop": true
 *       }
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
async function listSchedule(req, res, next) {
  serviceHelper.log('trace', 'View schedule API called');

  const { scheduleID } = req.params;

  try {
    const SQL = `SELECT * FROM light_schedules WHERE id = ${scheduleID}`;
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('lights');
    const dbClient = await dbConnection.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensors');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool
    await dbClient.end(); // Close data store connection

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
skill.get('/schedules/:scheduleID', listSchedule);

/**
 * @api {put} /schedules/:scheduleID save schedule
 * @apiName save
 * @apiGroup Schedules
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": { saved }
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function saveSchedule(req, res, next) {
  serviceHelper.log('trace', 'Save Schedule API called');

  serviceHelper.log('trace', `Params: ${JSON.stringify(req.params)}`);
  serviceHelper.log('trace', `Body: ${JSON.stringify(req.body)}`);

  let results;

  const { scheduleID } = req.params;
  const {
    type,
    name,
    hour,
    minute,
    // eslint-disable-next-line camelcase
    ai_override,
    active,
    // eslint-disable-next-line camelcase
    light_group_number,
    brightness,
    scene,
    // eslint-disable-next-line camelcase
    color_loop,
  } = req.body;

  try {
    // Update data in data store
    const SQL = 'UPDATE light_schedules SET type=$2, name=$3, hour=$4, minute=$5, ai_override=$6, active=$7, light_group_number=$8, brightness=$9, scene=$10, color_loop=$11 WHERE id = $1';
    // eslint-disable-next-line camelcase
    const SQLValues = [
      scheduleID,
      type,
      name,
      hour,
      minute,
      // eslint-disable-next-line camelcase
      ai_override,
      active,
      // eslint-disable-next-line camelcase
      light_group_number,
      brightness,
      scene,
      // eslint-disable-next-line camelcase
      color_loop,
    ];

    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('lights');
    const dbClient = await dbConnection.connect(); // Connect to data store
    serviceHelper.log('trace', 'Save sensor schedule');
    results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool
    await dbClient.end(); // Close data store connection

    // Send data back to caler
    if (results.rowCount === 1) {
      serviceHelper.log(
        'info',
        `Saved sensor data: ${JSON.stringify(req.body)}`,
      );

      serviceHelper.log('info', 'Reseting schedules');
      await schedules.setSchedule(true); // re-set light schedules

      serviceHelper.sendResponse(res, 200, 'saved');
    } else {
      serviceHelper.log('error', 'Failed to save data');
      serviceHelper.sendResponse(res, 500, 'failed to save');
    }
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, 500, err);
    next();
  }
  return true;
}
skill.put('/schedules/:scheduleID', saveSchedule);

/**
 * @api {get} /schedules Display in memory schedules
 * @apiName schedules
 * @apiGroup Schedules
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      data: [
 *       {
 *           "name": "<Anonymous Job 1>"
 *       },
 *
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function globalSchedule(req, res, next) {
  serviceHelper.log('trace', 'Display in memory schedules');

  const returnData = [];

  global.schedules.forEach((value) => {
    returnData.push({ name: value.name });
  });

  serviceHelper.sendResponse(res, 200, returnData);
  next();
}
skill.get('/schedules', globalSchedule);

module.exports = skill;
