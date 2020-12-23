/**
 * Import helper libraries
 */
const debug = require('debug')('Lights:API_LightGroups');

// Import Schemas
const updateLightGroupSchema = require('../../schemas/update_light_group.json');

/**
 * @type get
 * @path /lightgroups
 */
async function lightGroups(req, res, next) {
  debug(`List all light groups API called`);

  try {
    const hueData = this.lightGroupData.filter(
      (o) => o.attributes.attributes.type === 'Room',
    );

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
  debug(`Display light group state API called`);
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

    const hueData = this.lightGroupData.filter(
      (item) =>
        item.attributes.attributes.id.toString() ===
        lightGroupNumber.toString(),
    );
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
  debug(`Update light group state API called`);

  debug(`Check for valid params`);
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
      }
      return err;
    }

    debug(`Get light group data`);
    const lightGroup = this.lightGroupData.filter(
      (item) =>
        item.attributes.attributes.id.toString() ===
        lightGroupNumber.toString(),
    );

    if (lightGroup.length === 0) {
      const err = new Error('No light group found');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 500, err);
      }
      return err;
    }
    const hueData = lightGroup[0];

    debug(`Update light group state`);
    if (typeof power !== 'undefined' && power != null) hueData.on = power;
    if (typeof brightness !== 'undefined' && brightness != null)
      hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null) {
      const lightColor = await this.lightScene(scene);
      if (hueData.colorMode === 'xy') hueData.xy = lightColor.xy;
      if (hueData.colorMode === 'ct') hueData.ct = lightColor.ct;
    }
    if (colorLoop) hueData.effect = 'colorloop';

    // Save light group state
    debug(
      `Saving light group ${this.getLightGroupName(lightGroupNumber)} state`,
    );

    const saved = await this.hue.groups.save(hueData);
    if (saved) {
      this.logger.info(
        `Light group (${this.getLightGroupName(lightGroupNumber)}) was turned ${
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
