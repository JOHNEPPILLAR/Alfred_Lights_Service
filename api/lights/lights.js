/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('../../lib/helper.js');
const hueBridge = require('huejay');
//const _ = require('underscore');

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
  try {
    const lights = await hue.groups.getAll();
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, lights);
      next();
    } else {
      return lights;
    }
  } catch (err) {
    serviceHelper.log('error', 'listLightGroups', err);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, null, err);
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
    serviceHelper.sendResponse(res, true, 'Turned off all lights.');
    next();
    return true;
  } catch (err) {
    serviceHelper.log('error', 'allOff', err);
    serviceHelper.sendResponse(res, null, 'There was a problem turning off all the lights.');
    return err;
  }
}
skill.get('/alloff', allOff);

/**
 * @api {put} /lights/lightonoff Turn lights on or off
 * @apiName lightonoff
 * @apiGroup Lights
 *
 * @apiParam {Number} light_number Hue bridge light number
 * @apiParam {String} light_status [ on, off ]
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
  const {
    lightNumber, lightAction, brightness, x, y, ct,
  } = req.body;

  let returnState;
  let returnMessage;

  try {
    serviceHelper.log('trace', 'lightOnOff', 'allOff API called');

    // Configure light state
    serviceHelper.log('trace', 'lightOnOff', 'Setting up light state to save');
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
    serviceHelper.log('trace', 'lightOnOff', 'Saving light state');
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
    serviceHelper.sendResponse(res, returnState, returnMessage);
    next();
  } catch (err) {
    serviceHelper.log('error', 'lightOnOff', err);
    serviceHelper.sendResponse(res, null, err);
    next();
  }
}
skill.put('/lightonoff', lightOnOff);

module.exports = {
  skill,
  listLights,
  listLightGroups,
};
