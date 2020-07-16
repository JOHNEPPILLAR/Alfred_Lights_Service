// Import Schemas
const updateLightSchema = require('../../schemas/update_light.json');

/**
 * @type get
 * @path /lights
 */
async function lights(req, res, next) {
  this.logger.debug(`${this._traceStack()} - List all lights API called`);

  try {
    const hueData = await this.hue.lights.getAll();
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
 * @path /lights/:lightNumber
 */
async function lightState(req, res, next) {
  this.logger.debug(`${this._traceStack()} - Display light state API called`);
  try {
    const { lightNumber } = req.params;
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(lightNumber)) {
      const err = new Error('param: lightNumber is not a number');
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 400, err);
      }
      return err;
    }

    const hueData = await this.hue.lights.getById(lightNumber);
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
 * @path /lights/:lightNumber
 */
async function updateLight(req, res, next) {
  this.logger.debug(`${this._traceStack()} - Update light state API called`);

  this.logger.trace(`${this._traceStack()} - Check for valid params`);
  const validSchema = this._validateSchema(req, updateLightSchema);
  if (validSchema !== true) {
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, validSchema);
    }
    return validSchema;
  }

  const { lightNumber, power, brightness, scene, colorLoop } = req.params;

  try {
    const hueData = await this.hue.lights.getById(lightNumber);
    if (typeof power !== 'undefined' && power != null) hueData.on = power;
    if (typeof brightness !== 'undefined' && brightness != null)
      hueData.brightness = brightness;
    if (typeof scene !== 'undefined' && scene != null)
      hueData.xy = this.lightSceneXY(scene);
    if (colorLoop) hueData.effect = 'colorloop';

    // Save light state
    this.logger.trace(
      `${this._traceStack()} - Saving light ${this.getLightName(
        lightNumber,
      )} state`,
    );
    const saved = await this.hue.lights.save(hueData);
    if (saved) {
      this.logger.info(
        `Light ${this.getLightName(lightNumber)} turned ${
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
        `There was an error updating light ${this.getLightName(
          lightNumber,
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
  lights,
  lightState,
  updateLight,
};
