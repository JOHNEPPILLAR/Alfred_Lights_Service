/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');
const hueBridge = require('huejay');

/**
 * Import helper libraries
 */
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const virtualHost = require('../../package.json').name;
const lightNames = require('../helpers/light-names.js');
const sensors = require('../sensors/controller.js');
const schedules = require('../schedules/controller.js');
const APIroot = require('../api/root/root.js');
const APIlights = require('../api/lights/lights.js');
const APIlightGroups = require('../api/lights/light-groups.js');
const APIsensors = require('../api/sensors/sensors.js');
const APIschedules = require('../api/schedules/schedules.js');

global.APITraceID = '';
global.schedules = [];
global.lightNames = [];
global.lightGroupNames = [];
global.schedules = [];

async function setupAndRun() {
  // Create restify server
  const server = await serviceHelper.setupRestifyServer(virtualHost, version);

  // Setup API middleware
  await serviceHelper.setupRestifyMiddleware(server, virtualHost);

  // Configure API end points
  APIroot.applyRoutes(server);
  APIlights.skill.applyRoutes(server);
  APIlightGroups.skill.applyRoutes(server);
  APIsensors.skill.applyRoutes(server);
  APIschedules.applyRoutes(server);

  // Capture and process API errors
  await serviceHelper.captureRestifyServerErrors(server);

  // Start service and listen to requests
  server.listen(process.env.PORT, async () => {
    serviceHelper.log(
      'info',
      `${serviceName} has started`,
    );
    if (process.env.MOCK === 'true' || process.env.MOCK === 'lights') {
      serviceHelper.log(
        'info',
        'Mocking enabled, will not setup monitors or schedules',
      );
    } else {
      // Setup Hue bridge
      const HueBridgeIP = await serviceHelper.vaultSecret(
        process.env.ENVIRONMENT,
        'HueBridgeIP',
      );
      const HueBridgeUser = await serviceHelper.vaultSecret(
        process.env.ENVIRONMENT,
        'HueBridgeUser',
      );
      global.hue = new hueBridge.Client({
        host: HueBridgeIP,
        username: HueBridgeUser,
      });
      global.hue.bridge.isAuthenticated()
        .then(() => {
          serviceHelper.log(
            'info',
            'Connected to Hue bridge',
          );
        })
        .catch((err) => {
          serviceHelper.log(
            'error',
            err.message,
          );
          return false;
        });
      await lightNames.setup();
      await schedules.setSchedule(); // Setup light schedules
      await sensors.setup(); // Monitor sensors
    }
  });
}

setupAndRun();
