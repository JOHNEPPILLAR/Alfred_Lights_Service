/**
 * Import external libraries
 */
const { Service } = require('alfred-base');

// Setup service options
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const namespace = require('../../package.json').name;

const options = {
  serviceName,
  namespace,
  serviceVersion: version,
};

// Bind setup functions to base class
Object.assign(Service.prototype, require('./hueSetup'));

// Bind api functions to base class
Object.assign(Service.prototype, require('../api/lights/lights'));
Object.assign(Service.prototype, require('../api/lights/light-groups'));
Object.assign(Service.prototype, require('../api/sensors/sensors'));
Object.assign(Service.prototype, require('../api/schedules/schedules'));

// Bind sensor functions to base class
Object.assign(Service.prototype, require('../sensors/controller'));

// Bind schedule functions to base class
Object.assign(Service.prototype, require('../schedules/controller'));

// Create and extend base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Light and light group names in memory store
  service.lightNames = [];
  service.lightGroupNames = [];

  // Connect to Hue bridge
  await service.connectToHue();

  // Apply api routes
  service.restifyServer.get('/lights', (req, res, next) =>
    service.lights(req, res, next),
  );
  service.logger.trace(`${service._traceStack()} - Added get:/lights api`);

  service.restifyServer.get('/lights/:lightNumber', (req, res, next) =>
    service.lightState(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/lights/:lightNumber api`,
  );

  service.restifyServer.put('/lights/:lightNumber', (req, res, next) =>
    service.updateLight(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added put:/lights/:lightNumber api`,
  );

  service.restifyServer.get('/lightgroups', (req, res, next) =>
    service.lightGroups(req, res, next),
  );
  service.logger.trace(`${service._traceStack()} - Added get:/lightgroups api`);

  service.restifyServer.get(
    '/lightgroups/:lightGroupNumber',
    (req, res, next) => service.lightGroupState(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/lightgroups/:lightNumber api`,
  );

  service.restifyServer.put(
    '/lightgroups/:lightGroupNumber',
    (req, res, next) => service.updateLightGroup(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added put:/lightgroups/:lightNumber api`,
  );

  service.restifyServer.get('/sensors', (req, res, next) =>
    service.sensors(req, res, next),
  );
  service.logger.trace(`${service._traceStack()} - Added get:/sensors api`);

  service.restifyServer.get('/sensors/schedules', (req, res, next) =>
    service.listSensorsSchedules(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/sensors/schedules api`,
  );

  service.restifyServer.get('/sensors/schedules/:sensorID', (req, res, next) =>
    service.listSensorSchedule(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/sensors/schedules/:sensorID api`,
  );

  service.restifyServer.get(
    '/sensors/schedules/rooms/:roomNumber',
    (req, res, next) => service.listSensorSchedulesRoom(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/sensors/schedules/rooms/:roomNumber api`,
  );

  service.restifyServer.put('/sensors/schedules/:id', (req, res, next) =>
    service.saveSensors(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added put:/sensors/schedules/:id api`,
  );

  service.restifyServer.get('/schedules/rooms/:roomNumber', (req, res, next) =>
    service.listSchedulesRoom(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/schedules/rooms/:roomNumber api`,
  );

  service.restifyServer.get('/schedules/:scheduleID', (req, res, next) =>
    service.listSchedule(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/schedules/:scheduleID api`,
  );

  service.restifyServer.put('/schedules/:id', (req, res, next) =>
    service.saveSchedule(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added put:/schedules/:id api`,
  );

  if (process.env.MOCK === 'true') {
    service.logger.info(
      'Mocking enabled, will not activate motion sensors or set schedules',
    );
  } else {
    // Add schedules
    await service.setupSchedules();
    await service.activateSchedules();
    // Activate sensors
    await service.activateSensors();
  }

  // Listen for api requests
  service.listen();
}
setupServer();
