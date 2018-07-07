/**
 * Import external libraries
 */
require('dotenv').config();

const serviceHelper = require('./helper.js');
const lightNames = require('./lightNames.js');
const restify = require('restify');
const fs = require('fs');
const UUID = require('pure-uuid');
const { Pool } = require('pg');

global.lightsDataClient = new Pool({
  host: process.env.DataStore,
  database: 'lights',
  user: process.env.DataStoreUser,
  password: process.env.DataStoreUserPassword,
  port: 5432,
});

global.schedulesDataClient = new Pool({
  host: process.env.DataStore,
  database: 'schedules',
  user: process.env.DataStoreUser,
  password: process.env.DataStoreUserPassword,
  port: 5432,
});

global.instanceTraceID = new UUID(4);
global.callTraceID = null;
global.lightNames = [];
global.lightGroupNames = [];

/**
 * Restify server Init
 */
const server = restify.createServer({
  name: process.env.ServiceName,
  version: process.env.Version,
  key: fs.readFileSync('./certs/server.key'),
  certificate: fs.readFileSync('./certs/server.crt'),
});

/**
 * Setup API middleware
 */
server.use(restify.plugins.jsonBodyParser({ mapParams: true }));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser({ mapParams: true }));
server.use(restify.plugins.fullResponse());
server.use((req, res, next) => {
  if (process.env.Debug === 'true') serviceHelper.log('trace', null, req.url);
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
});
server.use((req, res, next) => {
  // Check for a trace id
  if (typeof req.headers['trace-id'] === 'undefined') { global.callTraceID = new UUID(4); } // Generate new trace id

  // Check for valid auth key
  if (req.headers['client-access-key'] !== process.env.ClientAccessKey) {
    serviceHelper.log('warn', null, `Invaid client access key: ${req.headers.ClientAccessKey}`);
    serviceHelper.sendResponse(res, 401, 'There was a problem authenticating you.');
    return;
  }
  next();
});

server.on('NotFound', (req, res, err) => {
  serviceHelper.log('error', null, `${err}`);
  serviceHelper.sendResponse(res, 404, err.message);
});
server.on('uncaughtException', (req, res, route, err) => {
  serviceHelper.log('error', null, `${route}: ${err}`);
  serviceHelper.sendResponse(res, null, err.message);
});

/**
 * Configure API end points
 */
require('../api/root/root.js').applyRoutes(server);
require('../api/lights/lights.js').skill.applyRoutes(server, '/lights');

/**
 * Stop server if process close event is issued
 */
async function cleanExit() {
  serviceHelper.log('warn', null, 'Service stopping');
  serviceHelper.log('warn', null, 'Closing the data store pools');
  await global.lightsDataClient.end();
  await global.schedulesDataClient.end();
  serviceHelper.log('warn', null, 'Close rest server');
  server.close(() => { // Ensure rest server is stopped
    serviceHelper.log('warn', null, 'Exit the app');
    process.exit(); // Exit app
  });
}
process.on('exit', () => { cleanExit(); });
process.on('SIGINT', () => { cleanExit(); });
process.on('SIGTERM', () => { cleanExit(); });
process.on('uncaughtException', (err) => {
  if (err) serviceHelper.log('error', null, err); // log the error
});

/**
 * Data store error events
 */
global.lightsDataClient.on('error', (err) => {
  serviceHelper.log('error', null, 'Lights data store: Unexpected error on idle client');
  serviceHelper.log('error', null, err);
  cleanExit();
});

global.schedulesDataClient.on('error', (err) => {
  serviceHelper.log('error', null, 'Schedules data store: Unexpected error on idle client');
  serviceHelper.log('error', null, err);
  cleanExit();
});

/**
 * Check service dependancies and wait until they are ready
 */
async function dependencyHealthCheck() {
  const apiURL = `${process.env.LogService}/ping`;

  serviceHelper.log('trace', 'dependencyHealthCheck', `Calling: ${apiURL}`);
  try {
    const healthCheckData = await serviceHelper.callAlfredServiceGet(apiURL, true);
    if (healthCheckData instanceof Error) {
      serviceHelper.log('trace', 'dependencyHealthCheck', 'Log Service not responding');
      setTimeout(() => { dependencyHealthCheck(); }, 30000);
      return false;
    }

    // Register service
    if (!serviceHelper.registerService()) {
      serviceHelper.log('error', 'dependencyHealthCheck', 'Unable to register service');
      cleanExit();
    }
    const theInterval = 5 * 60 * 1000;
    setInterval(() => {
      serviceHelper.registerService();
    }, theInterval);

    setTimeout(() => { lightNames.setup(); }, 1000);

    // Start service and listen to requests
    server.listen(process.env.Port, () => {
      serviceHelper.log('trace', null, `${process.env.ServiceName} has started and is listening on port ${process.env.Port}`);
    });
  } catch (err) {
    serviceHelper.log('error', 'dependencyHealthCheck', err);
  }
  return true;
}

dependencyHealthCheck();
