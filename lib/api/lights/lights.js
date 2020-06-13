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
const updateLightSchema = require('../../schemas/update_light.json');

/**
 * @type get
 * @path /lights
 */
async function list(req, res, next) {
  serviceHelper.log(
    'info',
    'List all lights API called',
  );

  // Mock
  if (process.env.MOCK === 'true') {
    serviceHelper.log(
      'trace',
      'Mock mode enabled, returning mock',
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        listLightsMock,
      );
      next();
    }
    return listLightsMock;
  }

  // Non mock
  try {
    const hueData = await global.hue.lights.getAll();
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        hueData,
      );
      next();
    } else {
      return hueData;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get(
  '/lights',
  list,
);

/**
 * @type get
 * @path /lights/:lightNumber
 */
async function lightState(req, res, next) {
  serviceHelper.log(
    'info',
    'Get light state API called',
  );

  const { lightNumber } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(lightNumber)) {
    const err = new Error('param: lightNumber is not a number');
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        400,
        err,
      );
      next();
    }
    return err;
  }

  // Mock
  if (process.env.MOCK === 'true') {
    serviceHelper.log(
      'trace',
      'Mock mode enabled, returning mock',
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        listLightMock,
      );
      next();
    }
    return listLightMock;
  }

  // Non mock
  try {
    const hueData = await global.hue.lights.getById(lightNumber);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        hueData,
      );
      next();
    } else {
      return hueData;
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get(
  '/lights/:lightNumber',
  lightState,
);

/**
 * @type put
 * @path /lights/:lightNumbe
 */
async function updateLight(req, res, next) {
  serviceHelper.log(
    'info',
    'Update light state API called',
  );

  const {
    lightNumber,
    power,
    brightness,
    scene,
    colorLoop,
  } = req.body;

  try {
    const hueData = await global.hue.lights.getById(lightNumber);
    if (typeof power !== 'undefined' && power != null) hueData.on = power;
    if (typeof brightness !== 'undefined' && brightness != null) hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null) hueData.xy = serviceHelper.lightSceneXY(scene);
    if (colorLoop) hueData.effect = 'colorloop';
    serviceHelper.log(
      'trace',
      hueData,
    );

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
        )} turned ${power ? 'on' : 'off'}`,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          200,
          '{ "state": "saved" }',
        );
        next();
      } else {
        return true;
      }
    } else {
      throw new Error(`There was an error updating light ${serviceHelper.getLightName(lightNumber)} state`);
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        500,
        err,
      );
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.put(
  '/lights/:lightNumber',
  serviceHelper.validateSchema(updateLightSchema),
  updateLight,
);

module.exports = {
  skill,
  list,
  lightState,
  updateLight,
};
