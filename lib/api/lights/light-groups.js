/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

/**
 * Import mocks
 */
const listLightGroupsMock = require('../../mock/listLightGroups.json');
const listLightGroupMock = require('../../mock/listLightGroup.json');

const skill = new Skills();
const updateLightGroupSchema = require('../../schemas/update_light_group.json');

/**
 * @type get
 * @path /lightgroups
 */
async function list(req, res, next) {
  serviceHelper.log(
    'trace',
    'list all light groups API called',
  );

  // Mock
  if (process.env.MOCK === 'true') {
    serviceHelper.log(
      'trace',
      'Mock mode enabled, returning mock',
    );
    let hueData = listLightGroupsMock;
    hueData = hueData.filter((o) => o.attributes.attributes.class !== undefined);

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(
        res,
        200,
        hueData,
      );
      next();
    }
    return hueData;
  }

  // Non mock
  try {
    serviceHelper.log(
      'trace',
      'Get all light groups',
    );
    let hueData = await global.hue.groups.getAll();
    serviceHelper.log(
      'trace',
      'Remove dimmers etc from data',
    );
    hueData = hueData.filter((o) => o.attributes.attributes.type === 'Room');
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
    serviceHelper.log('error', err.message);
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
  '/lightgroups',
  list,
);

/**
 * @type get
 * @path /lightgroups/:lightGroupNumber
 */
async function lightGroupState(req, res, next) {
  serviceHelper.log(
    'trace',
    'Get light state API called',
  );

  const { lightGroupNumber } = req.params;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(lightGroupNumber)) {
    const err = new Error('param: lightGroupNumber is not a number');
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
        listLightGroupMock,
      );
      next();
    }
    return listLightGroupMock;
  }

  // Non mock
  try {
    serviceHelper.log(
      'trace',
      'Get light group state',
    );
    const hueData = await global.hue.groups.getById(lightGroupNumber);
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
  '/lightgroups/:lightGroupNumber',
  lightGroupState,
);

/**
 * @type put
 * @path /lightgroups/:lightGroupNumber
 */
async function updateLightGroup(req, res, next) {
  serviceHelper.log(
    'trace',
    'Update light group state API called',
  );

  try {
    const {
      lightGroupNumber,
      power,
      brightness,
      scene,
      colorLoop,
    } = req.params;

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(lightGroupNumber)) {
      const err = new Error('param: lightGroupNumber is not a number');
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

    serviceHelper.log(
      'trace',
      'Get light group data',
    );
    const hueData = await global.hue.groups.getById(lightGroupNumber);

    serviceHelper.log(
      'trace',
      'Update light group state',
    );
    if (typeof power !== 'undefined' && power != null) hueData.on = power;
    if (typeof brightness !== 'undefined' && brightness != null) hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null) hueData.xy = serviceHelper.lightSceneXY(scene);
    if (colorLoop) hueData.effect = 'colorloop';
    serviceHelper.log(
      'trace',
      hueData,
    );

    // Save light group state
    serviceHelper.log(
      'trace',
      `Saving light group ${serviceHelper.getLightGroupName(
        lightGroupNumber,
      )} state`,
    );
    const saved = await global.hue.groups.save(hueData);
    if (saved) {
      serviceHelper.log(
        'info',
        `Light group ${serviceHelper.getLightGroupName(
          lightGroupNumber,
        )} turned ${power ? 'on' : 'off'}`,
      );
      if (typeof res !== 'undefined' && res !== null) {
        serviceHelper.sendResponse(
          res,
          200,
          '{ state: saved }',
        );
        next();
      } else {
        return true;
      }
    } else {
      throw new Error(`There was an error updating light group ${serviceHelper.getLightName(lightGroupNumber)} state`);
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
  '/lightgroups/:lightGroupNumber',
  serviceHelper.validateSchema(updateLightGroupSchema),
  updateLightGroup,
);

module.exports = {
  skill,
  list,
  lightGroupState,
  updateLightGroup,
};
