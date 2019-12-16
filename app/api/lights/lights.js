/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

/**
 * Import mocks
 */
const listLightsMock = require('../../mock/listLights.json');
const listLightMock = require('../../mock/listLight.json');

const skill = new Skills();

/**
 * Light api's
 * {get} /lights
 * {get} /lights/:{lightNumber}
 * {put} /lights/:{lightNumber}
 */

/**
 * @api {get} /lights List all lights
 * @apiName lights
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     data: [ all lights ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function list(req, res, next) {
  serviceHelper.log('trace', 'list all lights API called');

  // Mock
  if (process.env.MOCK === 'true') {
    serviceHelper.log('trace', 'Mock mode enabled, returning mock');
    const returnJSON = listLightsMock;
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 200, returnJSON);
      next();
    }
    return returnJSON;
  }

  // Non mock
  try {
    const hueData = await global.hue.lights.getAll();
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 200, hueData);
      next();
    } else {
      return hueData;
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 500, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/lights', list);

/**
 * @api {get} /lights Get light state
 * @apiName lights
 * @apiGroup Lights
 *
 * @apiParam {Number} lightNumber Hue bridge light number
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     data: [ light state ]
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
  serviceHelper.log('trace', 'Get light state API called');

  const { lightNumber } = req.params;

  // Mock
  if (process.env.MOCK === 'true') {
    serviceHelper.log('trace', 'Mock mode enabled, returning mock');
    const returnJSON = listLightMock;
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 200, returnJSON);
      next();
    }
    return returnJSON;
  }

  // Non mock
  try {
    const hueData = await global.hue.lights.getById(lightNumber);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 200, hueData);
      next();
    } else {
      return hueData;
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 500, err.message);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/lights/:lightNumber', lightState);

/**
 * @api {put} /lights Update light state
 * @apiName lights
 * @apiGroup Lights
 *
 * @apiParam {Number} lightNumber Hue bridge light number
 * @apiParam {String} lightAction [ on, off ]
 * @apiParam {Number} brightness Brighness [ 0..255 ]
 * @apiParam {String} scene [ D-lhO-Ne8O0yQrD ]
 * @apiParam {String} colorLoop [ true, false ]
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     data: true
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function updateLight(req, res, next) {
  serviceHelper.log('trace', 'Update light state API called');
  serviceHelper.log('trace', `Params: ${JSON.stringify(req.params)}`);
  serviceHelper.log('trace', `Body: ${JSON.stringify(req.body)}`);

  const { lightNumber } = req.params;
  const {
    lightAction, brightness, scene, colorLoop,
  } = req.body;

  try {
    const hueData = await global.hue.lights.getById(lightNumber);
    hueData.on = false;
    if (lightAction === 'on') hueData.on = true;
    if (typeof brightness !== 'undefined' && brightness != null) hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null) hueData.xy = serviceHelper.lightSceneXY(scene);
    if (colorLoop) hueData.effect = 'colorloop';
    serviceHelper.log('trace', hueData);

    // Save light state
    serviceHelper.log(
      'trace',
      `Saving light ${serviceHelper.getLightName(lightNumber)} state`,
    );
    const saved = await global.hue.lights.save(hueData);
    if (saved) {
      serviceHelper.log(
        'info',
        `Light ${serviceHelper.getLightName(
          lightNumber,
        )} turned ${lightAction}`,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(res, 200, true);
        next();
      } else {
        return true;
      }
    } else {
      throw new Error(`There was an error updating light ${serviceHelper.getLightName(lightNumber)} state`);
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 500, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put('/lights/:lightNumber', updateLight);

module.exports = {
  skill,
  list,
  lightState,
  updateLight,
};
