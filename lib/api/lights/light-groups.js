// Import Schemas
const updateLightGroupSchema = require('../../schemas/update_light_group.json');

/**
 * @type get
 * @path /lightgroups
 */
async function lightGroups(req, res, next) {
  this.logger.debug(`${this._traceStack()} - List all light groups API called`);

  try {
    let hueData = await this.hue.groups.getAll();

    this.logger.trace(`${this._traceStack()} - Remove dimmers etc from data`);
    hueData = hueData.filter((o) => o.attributes.attributes.type === 'Room');

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, hueData);
    } else {
      return hueData;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    } else {
      return err;
    }
  }
  return true;
}

/**
 * @type get
 * @path /lightgroups/:lightGroupNumber
 */
async function lightGroupState(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - Display light group state API called`,
  );
  try {
    const { lightGroupNumber } = req.params;
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(lightGroupNumber)) {
      const err = new Error('param: lightGroupNumber is not a number');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 400, err);
      }
      return err;
    }

    const hueData = await this.hue.groups.getById(lightGroupNumber);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, hueData);
    } else {
      return hueData;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    } else {
      return err;
    }
  }
  return true;
}

/**
 * @type put
 * @path /lightgroups/:lightGroupNumber
 */
async function updateLightGroup(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - Update light group state API called`,
  );

  this.logger.trace(`${this._traceStack()} - Check for valid params`);
  const validSchema = this._validateSchema(req, updateLightGroupSchema);
  if (validSchema !== true) {
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, validSchema);
    }
    return validSchema;
  }

  const { lightGroupNumber, power, brightness, scene, colorLoop } = req.params;

  try {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(lightGroupNumber)) {
      const err = new Error('param: lightGroupNumber is not a number');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, err);
      } else {
        return err;
      }
    }

    this.logger.trace(`${this._traceStack()} - Get light group data`);
    const hueData = await this.hue.groups.getById(lightGroupNumber);

    this.logger.trace(`${this._traceStack()} - Update light group state`);
    if (typeof power !== 'undefined' && power != null) hueData.on = power;
    if (typeof brightness !== 'undefined' && brightness != null)
      hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null)
      hueData.xy = this.lightSceneXY(scene);
    if (colorLoop) hueData.effect = 'colorloop';

    // Save light group state
    this.logger.trace(
      `${this._traceStack()} - Saving light group ${this.getLightGroupName(
        lightGroupNumber,
      )} state`,
    );

    const saved = await this.hue.groups.save(hueData);
    if (saved) {
      this.logger.info(
        `Light group ${this.getLightGroupName(lightGroupNumber)} turned ${
          power ? 'on' : 'off'
        }`,
      );
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 200, { state: 'saved' });
      } else {
        return true;
      }
    } else {
      throw new Error(
        `There was an error updating light group ${this.getLightGroupName(
          lightGroupNumber,
        )} state`,
      );
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    } else {
      return err;
    }
  }
  return true;
}

module.exports = {
  lightGroups,
  lightGroupState,
  updateLightGroup,
};
