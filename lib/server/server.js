/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');
const restify = require('restify');
const UUID = require('pure-uuid');
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
let ClientAccessKey;

async function setupAndRun() {
  serviceHelper.log(
    'trace',
    'Getting certs',
  );
  const key = await serviceHelper.vaultSecret(
    process.env.ENVIRONMENT,
    `${virtualHost}_key`,
  );
  const certificate = await serviceHelper.vaultSecret(
    process.env.ENVIRONMENT,
    `${virtualHost}_cert`,
  );
  if (key instanceof Error || certificate instanceof Error) {
    serviceHelper.log(
      'error',
      'Not able to get secret (CERTS) from vault',
    );
    serviceHelper.log(
      'warn',
      'Exit the app',
    );
    process.exit(1); // Exit app
  }
  const server = restify.createServer({
    name: virtualHost,
    version,
    key,
    certificate,
  });

  // Setup API middleware
  server.on('NotFound', (req, res, err) => {
    serviceHelper.log(
      'error',
      `${err.message}`,
    );
    serviceHelper.sendResponse(
      res,
      404,
      { error: err.message },
    );
  });
  server.use(restify.plugins.jsonBodyParser({ mapParams: true }));
  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.queryParser({ mapParams: true }));
  server.use(restify.plugins.fullResponse());
  server.use((req, res, next) => {
    serviceHelper.log(
      'trace',
      `URL: ${req.url}`,
    );
    serviceHelper.log(
      'trace',
      `Params: ${JSON.stringify(req.params)}`,
    );
    serviceHelper.log(
      'trace',
      `Query: ${JSON.stringify(req.query)}`,
    );
    serviceHelper.log(
      'trace',
      `Body: ${JSON.stringify(req.body)}`,
    );
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self' ${virtualHost}`,
    );
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader(
      'X-Frame-Options',
      'SAMEORIGIN',
    );
    res.setHeader(
      'X-XSS-Protection',
      '1; mode=block',
    );
    res.setHeader(
      'X-Content-Type-Options',
      'nosniff',
    );
    res.setHeader(
      'Referrer-Policy',
      'no-referrer',
    );
    next();
  });
  server.use(async (req, res, next) => {
    // Check for a trace id
    if (typeof req.headers['api-trace-id'] === 'undefined') {
      global.APITraceID = new UUID(4);
    } else {
      global.APITraceID = req.headers['api-trace-id'];
    }

    // Check for valid auth key
    ClientAccessKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'ClientAccessKey',
    );
    if (ClientAccessKey instanceof Error) {
      serviceHelper.log(
        'error',
        'Not able to get secret (ClientAccessKey) from vault',
      );
      serviceHelper.sendResponse(
        res,
        500,
        new Error('There was a problem with the auth service'),
      );
      return;
    }
    if (req.headers['client-access-key'] !== ClientAccessKey) {
      serviceHelper.log(
        'warn',
        `Invaid client access key: ${req.headers['client-access-key']}`,
      );
      serviceHelper.sendResponse(
        res,
        401,
        'There was a problem authenticating you',
      );
      return;
    }
    next();
  });

  // Configure API end points
  APIroot.applyRoutes(server);
  APIlights.skill.applyRoutes(server);
  APIlightGroups.skill.applyRoutes(server);
  APIsensors.skill.applyRoutes(server);
  APIschedules.applyRoutes(server);

  // Stop server if process close event is issued
  function cleanExit() {
    serviceHelper.log(
      'warn',
      'Service stopping',
    );
    serviceHelper.log(
      'trace',
      'Close rest server',
    );
    server.close(() => {
      serviceHelper.log(
        'info',
        'Exit the app',
      );
      process.exit(1); // Exit app
    });
  }
  process.on('SIGINT', () => {
    cleanExit();
  });
  process.on('SIGTERM', () => {
    cleanExit();
  });
  process.on('SIGUSR2', () => {
    cleanExit();
  });
  process.on('uncaughtException', (err) => {
    serviceHelper.log(
      'error',
      err.message,
    ); // log the error
  });
  process.on('unhandledRejection', (reason, p) => {
    serviceHelper.log(
      'error',
      `Unhandled Rejection at Promise: ${p} - ${reason}`,
    ); // log the error
  });

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