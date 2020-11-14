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

  // Apply api routes
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

  service.restifyServer.get('/schedules', (req, res, next) =>
    service.listSchedules(req, res, next),
  );
  service.logger.trace(`${service._traceStack()} - Added get:/schedules api`);

  service.restifyServer.get('/schedules/:ID', (req, res, next) =>
    service.listSchedule(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added get:/schedules/:ID api`,
  );

  service.restifyServer.put('/schedules/:ID', (req, res, next) =>
    service.saveSensors(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added put:/schedules/:ID api`,
  );

  // Connect to Hue bridge
  await service.connectToHue();

  // Listen for api requests
  service.listen();

  // Hydrate light group and sensor caches
  service.logger.trace(
    `${service._traceStack()} - Setup light group and sensor cache`,
  );
  service.cacheIntival = 2000; // 2 seconds
  service.cacheTempIntival = service.cacheIntival;

  await service.updateCaches();

  if (process.env.MOCK === 'true') {
    service.logger.info(
      'Mocking enabled, will not activate motion sensors or set schedules',
    );
  } else {
    // Add schedules
    await service.setupSchedules();
    // Activate sensors
    service.activateSensors();
  }
}
setupServer();
