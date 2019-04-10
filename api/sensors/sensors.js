/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;

/**
 * Import helper libraries
 */
const serviceHelper = require('../../lib/helper.js');

const skill = new Skills();

/**
 * @api {get} /sensors/list List all of the sensors
 * @apiName list
 * @apiGroup Sensors
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *      "data": {
 *       "command": "SELECT",
 *       "rowCount": 7,
 *       "oid": null,
 *       "rows": [ .. ]",
 *       ...
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
async function listSensors(req, res, next) {
  serviceHelper.log('trace', 'List Sensors API called');

  let dbClient;
  let results;

  try {
    // Get data from data store
    const SQL = 'SELECT * FROM sensor_settings ORDER BY id';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensors');
    results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    // Send data back to caler
    serviceHelper.sendResponse(res, true, results);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err.message);
    next();
  }
  return true;
}
skill.get('/list', listSensors);

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
    id, start_time, end_time, scene, brightness, active,
  } = req.body;

  try {
    // Update data in data store
    const SQL = 'UPDATE sensor_settings SET start_time = $2, end_time = $3, scene = $4, brightness = $5, active = $6 WHERE id = $1';
    const SQLValues = [
      id,
      start_time,
      end_time,
      scene,
      brightness,
      active,
    ];

    serviceHelper.log('trace', 'Connect to data store connection pool');
    dbClient = await global.lightsDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Save sensor');
    results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    // Send data back to caler
    if (results.rowCount === 1) {
      serviceHelper.log('info', `Saved sensor data: ${JSON.stringify(req.body)}`);
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

module.exports = skill;
