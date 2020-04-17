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
 * @type get
 * @path /schedules/rooms/:roomNumber
 */
async function listSchedulesRoom(req, res, next) {
  serviceHelper.log(
    'trace',
    'List schedules for a given room API called',
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
    const SQL = `SELECT * FROM light_schedules WHERE light_group_number = ${roomNumber} ORDER BY id`;
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
      err.message,
    );
    next();
  }
  return true;
}
skill.get(
  '/schedules/rooms/:roomNumber',
  listSchedulesRoom,
);

/**
 * @type get
 * @path /schedules/:scheduleID
 */
async function listSchedule(req, res, next) {
  serviceHelper.log(
    'trace',
    'View schedule API called',
  );

  const { scheduleID } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(scheduleID)) {
    const err = new Error('param: scheduleID is not a number');
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
    const SQL = `SELECT * FROM light_schedules WHERE id = ${scheduleID}`;
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
  '/schedules/:scheduleID',
  listSchedule,
);

/**
 * @type put
 * @path /schedules/:scheduleID
 */
async function saveSchedule(req, res, next) {
  serviceHelper.log(
    'trace',
    'Update Schedule API called',
  );

  const {
    ID,
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

    const scheduleData = await listSchedule({ params: { scheduleID: ID } }, null, null);
    if (scheduleData instanceof Error) {
      serviceHelper.log(
        'error',
        scheduleData.message,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          500,
          scheduleData,
        );
        next();
      } else {
        return scheduleData;
      }
    }

    if (typeof type !== 'undefined' && type !== null) scheduleData[0].type = type;
    if (typeof name !== 'undefined' && name !== null) scheduleData[0].name = name;
    if (typeof hour !== 'undefined' && hour !== null) scheduleData[0].hour = hour;
    if (typeof minute !== 'undefined' && minute !== null) scheduleData[0].minute = minute;
    if (typeof aiOverride !== 'undefined' && aiOverride !== null) scheduleData[0].ai_override = aiOverride;
    if (typeof active !== 'undefined' && active !== null) scheduleData[0].active = active;
    if (typeof lightGroupNumber !== 'undefined' && lightGroupNumber !== null) scheduleData[0].light_group_number = lightGroupNumber;
    if (typeof brightness !== 'undefined' && brightness !== null) scheduleData[0].brightness = brightness;
    if (typeof scene !== 'undefined' && scene !== null) scheduleData[0].scene = scene;
    if (typeof colorLoop !== 'undefined' && colorLoop !== null) scheduleData[0].color_loop = colorLoop;

    serviceHelper.log(
      'trace',
      'Update db',
    );

    // Update data in data store
    const SQL = 'UPDATE light_schedules SET type=$2, name=$3, hour=$4, minute=$5, ai_override=$6, active=$7, light_group_number=$8, brightness=$9, scene=$10, color_loop=$11 WHERE id = $1';
    const SQLValues = [
      ID,
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

    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('lights');
    serviceHelper.log(
      'trace',
      'Save sensor schedule',
    );
    const results = await dbConnection.query(SQL, SQLValues);
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

      serviceHelper.log(
        'info',
        'Reseting schedules',
      );
      await schedules.setSchedule(); // re-set light schedules

      serviceHelper.sendResponse(
        res,
        200,
        '{ saved }',
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
  '/schedules/:ID',
  saveSchedule,
);

module.exports = skill;
