/**
 * Import external libraries
 */
const { Service } = require('alfred-base');
const debug = require('debug')('Lights:Server');

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

// Bind data collector functions to base class
Object.assign(Service.prototype, require('../collectors/dimmer/dimmer'));

// Create and extend base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Apply api routes
  service.restifyServer.get('/lightgroups', (req, res, next) =>
    service.lightGroups(req, res, next),
  );
  debug(`Added get '/lightgroups' api`);

  service.restifyServer.get(
    '/lightgroups/:lightGroupNumber',
    (req, res, next) => service.lightGroupState(req, res, next),
  );
  debug(`Added get 'lightgroups/:lightNumber' api`);

  service.restifyServer.put(
    '/lightgroups/:lightGroupNumber',
    (req, res, next) => service.updateLightGroup(req, res, next),
  );
  debug(`Added put '/lightgroups/:lightNumber' api`);

  service.restifyServer.get('/sensors', (req, res, next) =>
    service.sensors(req, res, next),
  );
  debug(`Added get '/sensors' api`);

  service.restifyServer.get('/schedules', (req, res, next) =>
    service.listSchedules(req, res, next),
  );
  debug(`Added get '/schedules' api`);

  service.restifyServer.get('/schedules/:ID', (req, res, next) =>
    service.listSchedule(req, res, next),
  );
  debug(`Added get '/schedules/:ID' api`);

  service.restifyServer.put('/schedules/:ID', (req, res, next) =>
    service.saveSensors(req, res, next),
  );
  debug(`Added put '/schedules/:ID' api`);

  // Connect to Hue bridge
  await service.connectToHue();

  // Hydrate light group and sensor caches
  debug(`Setup light group and sensor cache`);
  service.cacheIntival = 2000; // 2 seconds
  service.cacheTempIntival = service.cacheIntival;

  await service.updateCaches();

  // Listen for api requests
  service.listen();

  if (process.env.MOCK === 'true') {
    service.logger.info(
      'Mocking enabled, will not activate motion sensors or set schedules',
    );
  } else {
    service._getDimmerDevices(); // Collect dimmer device data
    await service.setupSchedules(); // Add schedules
    service.activateSensors(); // Activate sensors
  }
}
setupServer();
