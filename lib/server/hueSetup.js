/**
 * Import external libraries
 */
const hueBridge = require('huejay');

async function updateCaches() {
  // Check cache backoff
  if (this.cacheTempIntival > this.cacheIntival) {
    this.cacheTempIntival = this.cacheIntival; // Reset timer to back to standard intival
    this.logger.debug(
      `${this._traceStack()} - Setting timer to ${
        this.cacheTempIntival / 1000
      } seconds`,
    );
  }

  // Get light group data
  try {
    const lightGroupData = await this.hue.groups.getAll();
    this.lightGroupData = lightGroupData;

    // Add all lights on hub group
    const allLightsGroup = await this.hue.groups.getById(0);
    this.lightGroupData.push(allLightsGroup);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (this.cacheTempIntival === this.cacheIntival) {
      this.cacheTempIntival *= 3; // Backoff polling intival
      this.logger.debug(
        `${this._traceStack()} - Setting timer to ${
          this.cacheTempIntival / 1000
        } seconds`,
      );
    }
  }

  // Get sensor data
  try {
    // Get all sensors
    const hueData = await this.hue.sensors.getAll();

    // Sensors
    this.sensorData = hueData.filter(
      (o) => o.type === 'ZLLPresence' || o.type === 'ZLLLightLevel',
    );

    // Dimmer switches
    this.dimmerData = hueData.filter(
      (o) => o.attributes.attributes.type === 'ZLLSwitch',
    );
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (this.cacheTempIntival === this.cacheIntival) {
      this.cacheTempIntival *= 3; // Backoff polling intival
      this.logger.debug(
        `${this._traceStack()} - Setting cache backoff timer to ${
          this.cacheTempIntival / 1000
        } seconds`,
      );
    }
  }

  setTimeout(async () => {
    await updateCaches.call(this);
  }, this.cacheTempIntival);
}

async function connectToHue() {
  try {
    // Setup Hue bridge
    const HueBridgeUser = await this._getVaultSecret('HueBridgeUser');
    const HueBridgeIP = await this._getVaultSecret('HueBridgeIP');

    this.hue = new hueBridge.Client({
      host: HueBridgeIP,
      username: HueBridgeUser,
    });
    await this.hue.bridge
      .isAuthenticated()
      .then(() => {
        this.logger.debug(`${this._traceStack()} - Connected to Hue bridge`);
      })
      .catch((err) => {
        this.logger.error(`${this._traceStack()} - ${err.message}`);
        this._fatal(true);
      });
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    this._fatal(true);
  }
}

function getLightGroupName(lightGroupNumber) {
  const lightGroupName = this.lightGroupData.filter(
    (item) =>
      item.attributes.attributes.id.toString() === lightGroupNumber.toString(),
  );
  if (lightGroupName.length > 0) {
    const returnVal = lightGroupName[0].name;
    return returnVal;
  }
  return '[not defined]';
}
function lightScene(scene) {
  let ct;
  let xy;

  switch (scene) {
    case 1: // Morning
      ct = 346;
      xy = [0.445, 0.4067];
      break;
    case 2: // Daytime
      ct = 156;
      xy = [0.3143, 0.3301];
      break;
    case 3: // Evening
      ct = 367;
      xy = [0.4578, 0.41];
      break;
    case 4: // Night
      ct = 366;
      xy = [0.561, 0.4042];
      break;
    default:
      // Daytime
      ct = 156;
      xy = [0.3143, 0.3301];
  }
  return { ct, xy };
}

module.exports = {
  connectToHue,
  updateCaches,
  getLightGroupName,
  lightScene,
};
