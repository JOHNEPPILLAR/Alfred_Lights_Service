/**
 * Import external libraries
 */
const hueBridge = require('huejay');
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

/**
 * Import mocks
 */
const listLightGroupsMock = require('../../mock/listLightGroups.json');
const listLightGroupMock = require('../../mock/listLightGroup.json');

const skill = new Skills();

// Setup Hue bridge
const { HueBridgeIP, HueBridgeUser } = process.env;
const hue = new hueBridge.Client({
  host: HueBridgeIP,
  username: HueBridgeUser,
  timeout: 15000, // Optional, timeout in milliseconds (15000 is the default)
});

/**
 * Light api's
 * {get} /lightgroups
 * {get} /lightgroups/:{lightNumber}
 * {put} /lightgroups/:{lightNumber}
 */

/**
 * @api {get} /lightgroups List all light groups
 * @apiName lightgroups
 * @apiGroup Lightgroups
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     data: [ all light groups ]
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
  serviceHelper.log('trace', 'list all light groups API called');

  // Mock
  if (process.env.Mock === 'true') {
    serviceHelper.log('trace', 'Mock mode enabled, returning mock');
    let hueData = listLightGroupsMock;
    hueData = hueData.filter(
      (o) => o.attributes.attributes.class !== undefined,
    );

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 200, hueData);
      next();
    }
    return hueData;
  }

  // Non mock
  try {
    let hueData = await hue.groups.getAll();
    serviceHelper.log('trace', 'Remove dimmers etc from data');
    hueData = hueData.filter((o) => o.attributes.attributes.type === 'Room');
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
skill.get('/lightgroups', list);

/**
 * @api {get} /lightgroups Get light group state
 * @apiName lightgroups
 * @apiGroup Lights
 *
 * @apiParam {Number} lightGroupNumber Hue bridge light group number
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
async function lightGroupState(req, res, next) {
  serviceHelper.log('trace', 'Get light state API called');

  const { lightGroupNumber } = req.params;

  // Mock
  if (process.env.Mock === 'true') {
    serviceHelper.log('trace', 'Mock mode enabled, returning mock');
    const hueData = listLightGroupMock;
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, 200, hueData);
      next();
    }
    return hueData;
  }

  // Non mock
  try {
    const hueData = await hue.groups.getById(lightGroupNumber);
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
skill.get('/lightgroups/:lightGroupNumber', lightGroupState);

/**
 * @api {put} /lightgroups Update light state
 * @apiName lights
 * @apiGroup Lights
 *
 * @apiParam {Number} lightGroupNumber Hue bridge light group number
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
async function updateLightGroup(req, res, next) {
  serviceHelper.log('trace', 'Update light group state API called');
  serviceHelper.log('trace', `Params: ${JSON.stringify(req.params)}`);
  serviceHelper.log('trace', `Body: ${JSON.stringify(req.body)}`);

  const { lightGroupNumber } = req.params;
  const {
    lightAction, brightness, scene, colorLoop,
  } = req.body;

  try {
    const hueData = await hue.groups.getById(lightGroupNumber);
    hueData.on = false;
    if (lightAction === 'on') hueData.on = true;
    if (typeof brightness !== 'undefined' && brightness != null) hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null) hueData.xy = serviceHelper.lightSceneXY(scene);
    if (colorLoop) hueData.effect = 'colorloop';
    serviceHelper.log('trace', hueData);

    // Save light group state
    serviceHelper.log(
      'trace',
      `Saving light group ${serviceHelper.getLightGroupName(
        lightGroupNumber,
      )} state`,
    );
    const saved = await hue.groups.save(hueData);
    if (saved) {
      serviceHelper.log(
        'info',
        `Light group ${serviceHelper.getLightGroupName(
          lightGroupNumber,
        )} turned ${lightAction}`,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(res, 200, true);
        next();
      } else {
        return true;
      }
    } else {
      throw new Error(`There was an error updating light group ${serviceHelper.getLightName(lightGroupNumber)} state`);
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
skill.put('/lightgroups/:lightGroupNumber', updateLightGroup);

module.exports = {
  skill,
  list,
  lightGroupState,
  updateLightGroup,
};
