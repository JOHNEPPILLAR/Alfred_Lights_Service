/**
 * Import external libraries
 */
const { format, createLogger, transports } = require('winston');
const rp = require('request-promise');
const ip = require('ip');
const os = require('os');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Ignore ssl for service to service mode

/**
 * Setup logger transports
 */
const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: 'DD-MM-YYYY HH:mm:ss',
    }),
    format.colorize({ all: true }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new transports.Console(),
  ],
});

/**
 * Call another Alfred service with PUT
 */
async function callAlfredServicePut(apiURL, body, retryCounter, noRetry) {
  const options = {
    method: 'PUT',
    uri: apiURL,
    json: true,
    headers: {
      'Client-Access-Key': process.env.ClientAccessKey,
      'Instance-Trace-ID': global.instanceTraceID,
      'Call-Trace-ID': global.callTraceID,
    },
    body,
  };

  try {
    return await rp(options);
  } catch (err) {
    let retryCount = retryCounter || 0;

    // Do not get in endless loop
    if (!apiURL.match(process.env.LogService)) {
      log('error', 'callAlfredServiceGet', err);
      return err;
    }

    console.log(`Can not connect to Log service: ${err.message}`);
    if (!noRetry) {
      console.log(`Waiting 1 minute before retrying. Attempt: ${retryCount}`);
      retryCount += 1;
      setTimeout(() => {
        callAlfredServicePut(apiURL, retryCount);
      }, 60000); // 1 minute delay before re-tyring
    }
    return err;
  }
}
exports.callAlfredServicePut = async (apiURL, body, noRetry) => {
  const apiResponse = await callAlfredServicePut(apiURL, body, 0, noRetry);
  return apiResponse;
};

/**
 * Call another Alfred service with Get
 */
async function callAlfredServiceGet(apiURL, retryCounter, noRetry) {
  const options = {
    method: 'GET',
    uri: apiURL,
    json: true,
    headers: {
      'Client-Access-Key': process.env.ClientAccessKey,
      'Instance-Trace-ID': global.instanceTraceID,
      'Call-Trace-ID': global.callTraceID,
    },
  };

  try {
    return await rp(options);
  } catch (err) {
    let retryCount = retryCounter || 0;

    if (!apiURL.match(process.env.LogService)) {
      log('error', 'callAlfredServiceGet', err);
      return err;
    }

    console.log(`Can not connect to Log service: ${err.message}`);
    if (!noRetry) {
      console.log(`Waiting 1 minute before retrying. Attempt: ${retryCount}`);
      retryCount += 1;
      setTimeout(() => {
        callAlfredServiceGet(apiURL, retryCount);
      }, 60000); // 1 minute delay before re-tyring
    }
    return err;
  }
}
exports.callAlfredServiceGet = async (apiURL, noRetry) => {
  const apiResponse = await callAlfredServiceGet(apiURL, 0, noRetry);
  return apiResponse;
};

/**
 * Display to local console or if in production call logging service
 */
function log(type, functionName, message) {
  if (process.env.Environment === 'dev') {
    switch (type) {
      case 'info':
        if (functionName === null) {
          logger.info(`${message}`);
        } else {
          logger.info(`${functionName}: ${message}`);
        }
        break;
      case 'trace':
        if (process.env.Debug === 'true') {
          if (functionName === null) {
            logger.info(`${message}`);
          } else {
            logger.info(`${functionName}: ${message}`);
          }
        }
        break;
      case 'warn':
        if (functionName === null) {
          logger.info(`${message}`);
        } else {
          logger.info(`${functionName}: ${message}`);
        }
        break;
      case 'error':
        if (functionName === null) {
          logger.error(`${message}`);
        } else {
          logger.error(`${functionName}: ${message}`);
        }
        break;
      case 'leak':
        logger.error('A memory leak occured');
        logger.error(`${message}`);
        break;
      default:
        logger.info(`${message}`);
        break;
    }
  } else {
    if (process.env.Debug === 'false' && type === 'trace') return;
    const apiURL = `${process.env.LogService}/save`;
    let logFriendlyMessage;

    if (message instanceof Error) {
      logFriendlyMessage = message.message;
    } else logFriendlyMessage = message;
    const body = {
      type, service: process.env.ServiceName, functionName, message: logFriendlyMessage,
    };
    callAlfredServicePut(apiURL, body); // Send to logging service
  }
}
exports.log = (type, functionName, message) => {
  log(type, functionName, message);
};

exports.registerService = () => {
  if (process.env.Environment !== 'dev') {
    const apiURL = `${process.env.LogService}/register`;
    const body = {
      service: process.env.ServiceName,
      ip: ip.address(),
      port: process.env.Port,
    };
    if (!callAlfredServicePut(apiURL, body)) {
      console.log('Error - Unable to register service');
      return false;
    }
  }
  return true;
};

/**
 * Construct and send JSON response back to caller
 */
exports.sendResponse = (res, status, dataObj) => {
  let httpHeaderCode;
  let rtnData = dataObj;

  switch (status) {
    case null: // Internal server error
      httpHeaderCode = 500;
      rtnData = {
        name: dataObj.name,
        message: dataObj.message,
      };
      break;
    case false: // Invalid params
      httpHeaderCode = 400;
      break;
    case 401: // Not authorised, invalid app_key
      httpHeaderCode = 401;
      break;
    case 404: // Resource not found
      httpHeaderCode = 404;
      break;
    default:
      httpHeaderCode = 200;
  }

  const returnJSON = {
    data: rtnData,
  };

  res.send(httpHeaderCode, returnJSON); // Send response back to caller
};

/**
 * Lights
 */
exports.getLightName = (param) => {
  const lightName = global.lightNames.filter(o => (o.id.toString() === param.toString()));
  if (lightName.length > 0) { return lightName[0].name; }
  return '[not defined]';
};

exports.getLightGroupName = (param) => {
  const lightGroupName = global.lightGroupNames.filter(o => (o.id.toString() === param.toString()));
  if (lightGroupName.length > 0) { return lightGroupName[0].name; }
  return '[not defined]';
};

/**
 * Light scene
 */
exports.lightSceneXY = (scene) => {
  let xy;
  switch (scene) {
    case 1: // Sunrise
      xy = [0.2488, 0.2012];
      break;
    case 2: // Daytime
      xy = [0.3104, 0.3234];
      break;
    case 3: // Sunset
      xy = [0.4425, 0.4061];
      break;
    case 4: // Evening
      xy = [0.5015, 0.4153];
      break;
    case 5: // Nighttime
      xy = [0.5554, 0.3668];
      break;
    default:
      xy = [0.3104, 0.3234];
  }
  return xy;
};

/**
 * Misc
 */
exports.isEmptyObject = (obj) => {
  if (obj == null) return true;
  if (obj.length > 0) return false;
  if (obj.length === 0) return true;
  if (typeof obj !== 'object') return true;
  return !Object.keys(obj).length;
};

exports.GetSortOrder = (prop) => {
  const obj = function AB(a, b) {
    if (a[prop] > b[prop]) {
      return 1;
    } else if (a[prop] < b[prop]) {
      return -1;
    }
    return 0;
  };
  return obj;
};

exports.zeroFill = (number, width) => {
  const pad = width - number.toString().length;
  if (pad > 0) {
    return new Array(pad + (/\./.test(number) ? 2 : 1)).join('0') + number;
  }
  return `${number}`; // always return a string
};

exports.cleanString = (input) => {
  let output = '';
  for (let i = 0; i < input.length; i += 1) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i);
    }
  }
  output = output.replace(/\0/g, '');
  return output;
};

exports.getCpuInfo = () => {
  const load = os.loadavg();
  const cpu = {
    load1: load[0],
    load5: load[1],
    load15: load[2],
    cores: os.cpus().length,
  };
  cpu.utilization = Math.min(Math.floor((load[0] * 100) / cpu.cores), 100);
  return cpu;
};

exports.getMemoryInfo = () => {
  const mem = {
    free: os.freemem(),
    total: os.totalmem(),
  };
  mem.percent = ((mem.free * 100) / mem.total);
  return mem;
};

exports.getOsInfo = () => {
  const osInfo = {
    uptime: os.uptime(),
    type: os.type(),
    release: os.release(),
    hostname: os.hostname(),
    arch: os.arch(),
    platform: os.platform(),
    user: os.userInfo(),
  };
  return osInfo;
};

exports.getProcessInfo = () => {
  const processInfo = {
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    argv: process.argv,
  };
  return processInfo;
};
