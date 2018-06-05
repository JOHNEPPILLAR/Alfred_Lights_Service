/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('../../lib/helper.js');
const hueBridge = require('huejay');

const skill = new Skills();

const { HueBridgeIP, HueBridgeUser } = process.env;
const hue = new hueBridge.Client({
  host: HueBridgeIP,
  username: HueBridgeUser,
  timeout: 15000, // Optional, timeout in milliseconds (15000 is the default)
});

/**
 * @api {get} /lights/listlights Lists all of the lights
 * @apiName listlights
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function listLights(req, res, next) {
  serviceHelper.log('trace', 'listLights', 'listLights API called');
  try {
    const lights = await hue.lights.getAll();
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, lights);
      next();
    } else {
      return lights;
    }
  } catch (err) {
    serviceHelper.log('error', 'listLights', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, null, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/listlights', listLights);

/**
 * @api {get} /lights/listlightgroups Lists all of the light groups
 * @apiName listlightgroups
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function listLightGroups(req, res, next) {
  serviceHelper.log('trace', 'listLightGroups', 'listLightGroups API called');

  // Mock
  if (process.env.Mock === 'true') {
    serviceHelper.log('trace', 'listLightGroups', 'Mock mode enabled');
    let returnJSON = require('../../mock/listLightGroups.json');
    serviceHelper.log('trace', 'listLightGroups', 'Remove dimmers etc from data');
    returnJSON = returnJSON.filter(o => (o.attributes.attributes.class !== undefined));
    serviceHelper.log('trace', 'listLightGroups', 'Return Mock');
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, returnJSON);
      next();
    }
    return returnJSON;
  }

  // Non mock
  try {
    serviceHelper.log('trace', 'listLightGroups', 'Get data from HUE bridge');
    let lights = await hue.groups.getAll();
    serviceHelper.log('trace', 'listLightGroups', 'Remove dimmers etc from data');
    lights = lights.filter(o => (o.attributes.attributes.type === 'Room'));
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, lights);
      next();
    } else {
      return lights;
    }
  } catch (err) {
    serviceHelper.log('error', 'listLightGroups', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/listlightgroups', listLightGroups);

/**
 * @api {get} /lights/alloff Turns off all lights
 * @apiName alloff
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function allOff(req, res, next) {
  try {
    serviceHelper.log('trace', 'allOff', 'allOff API called');
    const lights = await hue.groups.getById(0);
    lights.on = false;
    hue.groups.save(lights);
    serviceHelper.log('trace', 'allOff', 'Turned off all lights.');
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, 'Turned off all lights.');
      next();
    } else {
      return true;
    }
  } catch (err) {
    serviceHelper.log('error', 'allOff', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, 'There was a problem turning off all the lights.');
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/alloff', allOff);

/**
 * @api {put} /lights/lightonoff Turn lights on or off
 * @apiName lightonoff
 * @apiGroup Lights
 *
 * @apiParam {Number} lightNumber Hue bridge light number
 * @apiParam {String} lightAction [ on, off ]
 * @apiParam {Number} brightness Brighness [ 0..255 ]
 * @apiParam {Number} x Hue xy color [ 0..1 ]
 * @apiParam {Number} y Hue xy color [ 0..1 ]
 * @apiParam {Number} ct Hue ct color [153..500 ]
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: "The light was turned on."
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightOnOff(req, res, next) {
  serviceHelper.log('trace', 'lightOnOff', 'lightOnOff API called');
  serviceHelper.log('trace', 'lightOnOff', JSON.stringify(req.body));

  const {
    lightNumber, lightAction, brightness, x, y, ct,
  } = req.body;

  let returnState;
  let returnMessage;

  try {
    // Configure light state
    serviceHelper.log('trace', 'lightOnOff', `Setting up light state ${serviceHelper.getLightName(lightNumber)} to save`);
    const light = await hue.lights.getById(lightNumber);
    light.on = false;
    if (lightAction === 'on') {
      light.on = true;
      if (typeof brightness !== 'undefined' && brightness != null) {
        light.brightness = brightness;
      }
      if ((typeof x !== 'undefined' && x != null) &&
          (typeof y !== 'undefined' && y != null)) {
        light.xy = [x, y];
      }
      if (typeof ct !== 'undefined' && ct != null) {
        light.ct = ct;
      }
    }

    // Save light state
    serviceHelper.log('trace', 'lightOnOff', `Saving light ${serviceHelper.getLightName(lightNumber)} state`);
    const saved = await hue.lights.save(light);
    if (saved) {
      returnState = true;
      returnMessage = `Light ${serviceHelper.getLightName(lightNumber)} was turned ${lightAction}.`;
      serviceHelper.log('trace', 'lightOnOff', `Light ${serviceHelper.getLightName(lightNumber)} was turned ${lightAction}.`);
    } else {
      returnState = false;
      returnMessage = `There was an error turning light ${serviceHelper.getLightName(lightNumber)} ${lightAction}.`;
      serviceHelper.log('error', 'lightOnOff', `There was an error turning light ${serviceHelper.getLightName(lightNumber)} ${lightAction}.`);
    }
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, returnState, returnMessage);
      next();
    } else {
      return true;
    }
  } catch (err) {
    serviceHelper.log('error', 'lightOnOff', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put('/lightonoff', lightOnOff);

/**
 * @api {put} /lights/lightgrouponoff Turn light group on or off
 * @apiName lightgrouponoff
 * @apiGroup Lights
 *
 * @apiParam {Number} lightGroupNumber Hue bridge light group number
 * @apiParam {String} lightAction [ on, off ]
 * @apiParam {Number} brightness Brighness [ 0..255 ]
 * @apiParam {Number} x Hue xy color [ 0..1 ]
 * @apiParam {Number} y Hue xy color [ 0..1 ]
 * @apiParam {Number} ct Hue ct color [153..500 ]
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: "The light was turned on."
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightGroupOnOff(req, res, next) {
  serviceHelper.log('trace', 'lightGroupOnOff', 'lightGroupOnOff API called');
  serviceHelper.log('trace', 'lightGroupOnOff', JSON.stringify(req.body));

  const {
    lightGroupNumber, lightAction, brightness, x, y, ct, colorLoop,
  } = req.body;

  let returnState;
  let returnMessage;

  try {
    // Configure light state
    serviceHelper.log('trace', 'lightGroupOnOff', `Setting up light group ${serviceHelper.getLightGroupName(lightGroupNumber)} state to save`);
    const light = await hue.groups.getById(lightGroupNumber);
    light.on = false;
    if (lightAction === 'on') {
      light.on = true;
      if (typeof brightness !== 'undefined' && brightness != null) {
        light.brightness = brightness;
      }
      if ((typeof x !== 'undefined' && x != null) &&
          (typeof y !== 'undefined' && y != null)) {
        light.xy = [x, y];
      }
      if (typeof ct !== 'undefined' && ct != null) {
        light.ct = ct;
      }
      if (typeof colorLoop !== 'undefined' && colorLoop != null) {
        light.effect = 'colorloop';
      }
    }

    // Save light group state
    serviceHelper.log('trace', 'lightGroupOnOff', `Saving light group ${serviceHelper.getLightGroupName(lightGroupNumber)} state`);
    const saved = await hue.groups.save(light);
    if (saved) {
      returnState = true;
      returnMessage = `Light group ${serviceHelper.getLightGroupName(lightGroupNumber)} was turned ${lightAction}.`;
      serviceHelper.log('trace', 'lightGroupOnOff', `Light group ${serviceHelper.getLightGroupName(lightGroupNumber)} was turned ${lightAction}.`);
    } else {
      returnState = false;
      returnMessage = `There was an error turning light group ${serviceHelper.getLightGroupName(lightGroupNumber)} ${lightAction}.`;
      serviceHelper.log('error', 'lightGroupOnOff', `There was an error turning light group ${serviceHelper.getLightGroupName(lightGroupNumber)} ${lightAction}.`);
    }
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, returnState, returnMessage);
      next();
    } else {
      return true;
    }
  } catch (err) {
    serviceHelper.log('error', 'lightGroupOnOff', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put('/lightgrouponoff', lightGroupOnOff);

/**
 * @api {get} /lights/sensor List all sensors connected to the HUE bridge
 * @apiName sensor
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function sensor(req, res, next) {
  try {
    serviceHelper.log('trace', 'sensor', 'sensor API called');
    const sensors = await hue.sensors.getAll();

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, sensors); // Send response back to caller
      next();
    } else {
      return sensors;
    }
  } catch (err) {
    serviceHelper.log('error', 'sensor', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err); // Send response back to caller
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put('/sensor', sensor);

/**
 * @api {get} /lights/lightmotion List all light and motion sensors connected to the HUE bridge
 * @apiName lightMotion
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightMotion(req, res, next) {
  try {
    serviceHelper.log('trace', 'lightMotion', 'lightMotion API called');

    if (process.env.Mock === 'true') {
      serviceHelper.log('trace', 'getSensorData', 'Mock mode enabled');
      const returnJSON = require('../../mock/lightMotion.json');
      serviceHelper.log('trace', 'getSensorData', 'Return Mock');
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(res, true, returnJSON);
        next();
      } else {
        return returnJSON;
      }
    }

    let sensorData = await hue.sensors.getAll();
    serviceHelper.log('trace', 'lightMotion', 'Filter and only allow ZLLPresence and ZLLLightLevel in data');
    sensorData = sensorData.filter(o => (o.type === 'ZLLPresence' || o.type === 'ZLLLightLevel'));
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, sensorData);
      next();
    } else {
      return sensorData;
    }
  } catch (err) {
    serviceHelper.log('error', 'sensor', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/lightmotion', lightMotion);

/**
 * @api {get} /lights/lightstate Get the state of a light
 * @apiName lightstate
 * @apiGroup Lights
 *
 * @apiParam {Number} lightNumber Hue bridge light number
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightState(req, res, next) {
  serviceHelper.log('trace', 'lightState', 'lightState API called');
  serviceHelper.log('trace', 'lightState', JSON.stringify(req.body));

  try {
    const { lightNumber } = req.body;
    const lights = await hue.lights.getById(lightNumber);

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, lights.state.attributes);
      next();
    } else {
      return lights.state.attributes;
    }
  } catch (err) {
    serviceHelper.log('error', 'lightstate', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/lightstate', lightState);

/**
 * @api {get} /lights/lightgroupstate Get the state of a light group
 * @apiName lightgroupstate
 * @apiGroup Lights
 *
 * @apiParam {Number} lightNumber Hue bridge light number
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightGroupState(req, res, next) {
  serviceHelper.log('trace', 'lightGroupState', 'lightGroupState API called');
  serviceHelper.log('trace', 'lightGroupState', JSON.stringify(req.body));

  try {
    const { lightGroupNumber } = req.body;
    const lights = await hue.groups.getById(lightGroupNumber);

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, lights.state.attributes);
      next();
    } else {
      return lights.state.attributes;
    }
  } catch (err) {
    serviceHelper.log('error', 'lightGroupState', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/lightgroupstate', lightGroupState);

/**
 * @api {get} /lights/scenes List all light scenes
 * @apiName scenes
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function scenes(req, res, next) {
  try {
    serviceHelper.log('trace', 'scenes', 'scenes API called');
    const lights = await hue.scenes.getAll();

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, lights);
      next();
    } else {
      return lights;
    }
  } catch (err) {
    serviceHelper.log('error', 'scenes', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/scenes', scenes);

/**
 * @api {put} /lights/lightbrightness Update light brightness
 * @apiName lightbrightness
 * @apiGroup Lights
 *
 * @apiParam {Number} lightNumber Hue bridge light group number
 * @apiParam {Number} brightness Brighness [ 0..255 ]
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: "The light group was updated."
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightBrightness(req, res, next) {
  let returnMessage;
  let returnState;

  try {
    serviceHelper.log('trace', 'lightBrightness', 'lightBrightness API called');
    serviceHelper.log('trace', 'lightBrightness', JSON.stringify(req.body));

    const { lightNumber, brightness } = req.body;
    const lights = await hue.groups.getById(lightNumber);
    lights.brightness = brightness;
    const saved = await hue.groups.save(lights);
    if (saved) {
      returnState = true;
      returnMessage = `Light group ${serviceHelper.getLightGroupName(lightNumber)} brightness was set to ${brightness}.`;
      serviceHelper.log('trace', 'lightBrightness', `Light group ${serviceHelper.getLightGroupName(lightNumber)} brightness was set to ${brightness}.`);
    } else {
      returnState = false;
      returnMessage = `There was an error updating light group ${lightNumber} brighness to ${brightness}.`;
      serviceHelper.log('error', 'lightBrightness', `There was an error updating light group ${lightNumber} brighness to ${brightness}.`);
    }
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, returnState, returnMessage);
      next();
    } else {
      return returnMessage;
    }
  } catch (err) {
    serviceHelper.log('error', 'lightBrightness', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err); // Send response back to caller
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put('/lightbrightness', lightBrightness);

/**
 * @api {put} /lights/lightgroupbrightness Update light group brightness
 * @apiName lightgroupbrightness
 * @apiGroup Lights
 *
 * @apiParam {Number} lightGroupNumber Hue bridge light group number
 * @apiParam {Number} brightness Brighness [ 0..255 ]
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     sucess: 'true'
 *     data: "The light group was updated."
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function lightGroupBrightness(req, res, next) {
  let returnMessage;
  let returnState;

  try {
    serviceHelper.log('trace', 'lightGroupBrightness', 'lightGroupBrightness API called');
    serviceHelper.log('trace', 'lightGroupBrightness', JSON.stringify(req.body));

    const { lightGroupNumber, brightness } = req.body;
    const lights = await hue.groups.getById(lightGroupNumber);
    lights.brightness = brightness;
    const saved = await hue.groups.save(lights);
    if (saved) {
      returnState = true;
      returnMessage = `Light group ${serviceHelper.getLightGroupName(lightGroupNumber)} brightness was set to ${brightness}.`;
      serviceHelper.log('trace', 'lightGroupBrightness', `Light group ${serviceHelper.getLightGroupName(lightGroupNumber)} brightness was set to ${brightness}.`);
    } else {
      returnState = false;
      returnMessage = `There was an error updating light group ${lightGroupNumber} brighness to ${brightness}.`;
      serviceHelper.log('error', 'lightGroupBrightness', `There was an error updating light group ${lightGroupNumber} brighness to ${brightness}.`);
    }
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, returnState, returnMessage);
      next();
    } else {
      return returnMessage;
    }
  } catch (err) {
    serviceHelper.log('error', 'lightGroupBrightness', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err); // Send response back to caller
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put('/lightgroupbrightness', lightGroupBrightness);

module.exports = {
  skill,
  listLights,
  listLightGroups,
  lightGroupOnOff,
  lightOnOff,
  lightMotion,
  lightState,
  lightGroupState,
};
