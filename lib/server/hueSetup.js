/**
 * Import external libraries
 */
const hueBridge = require('huejay');

async function lightStaticDataSetup() {
  this.logger.trace(
    `${this._traceStack()} - Setting up light/light group names`,
  );

  try {
    // Setup light names
    const lightNameData = await this.hue.lights.getAll();
    if (lightNameData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${lightNameData.message}`);
    } else {
      lightNameData.map((value) =>
        this.lightNames.push({
          id: value.attributes.attributes.id,
          name: value.attributes.attributes.name,
          model: value.attributes.attributes.modelid,
        }),
      );
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Setup light group names
  try {
    this.lightGroupNames.push({
      id: 0,
      name: 'All lights',
    });
    const lightGroupNameData = await this.hue.groups.getAll();
    if (lightGroupNameData instanceof Error) {
      this.logger.error(
        `${this._traceStack()} - ${lightGroupNameData.message}`,
      );
    } else {
      lightGroupNameData.map((value) =>
        this.lightGroupNames.push({
          id: value.attributes.attributes.id,
          name: value.attributes.attributes.name,
        }),
      );
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

async function connectToHue() {
  try {
    // Setup Hue bridge
    const HueBridgeUser = await this._getVaultSecret('HueBridgeUser');
    const hueDevice = await this._bonjourScan('Philips-hue');
    const HueBridgeIP = hueDevice.referer.address;

    if (HueBridgeIP instanceof Error || HueBridgeUser instanceof Error) {
      this._fatal(true);
    }

    this.hue = new hueBridge.Client({
      host: HueBridgeIP,
      username: HueBridgeUser,
    });
    await this.hue.bridge
      .isAuthenticated()
      .then(() => {
        this.logger.debug(`${this._traceStack()} - Connected to Hue bridge`);
        lightStaticDataSetup.call(this);
      })
      .catch((err) => {
        this.logger.error(`${this._traceStack()} - ${err.message}`);
        return false;
      });
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

function getLightName(lightNumber) {
  const lightName = this.lightNames.filter(
    (item) => item.id.toString() === lightNumber.toString(),
  );
  if (lightName.length > 0) {
    const returnVal = lightName[0].name;
    return returnVal;
  }
  return '[not defined]';
}

function getLightGroupName(lightGroupNumber) {
  const lightGroupName = this.lightGroupNames.filter(
    (item) => item.id.toString() === lightGroupNumber.toString(),
  );
  if (lightGroupName.length > 0) {
    const returnVal = lightGroupName[0].name;
    return returnVal;
  }
  return '[not defined]';
}

function lightSceneXY(scene) {
  let xy;
  switch (scene) {
    case 1: // Sunrise
      xy = [0.2488, 0.2012];
      break;
    case 2: // Daytime
      xy = [0.3104, 0.3234];
      break;
    case 3: // Sunset
      xy = [0.4425, 0.4061];
      break;
    case 4: // Evening
      xy = [0.5015, 0.4153];
      break;
    case 5: // Nighttime
      xy = [0.5554, 0.3668];
      break;
    default:
      xy = [0.3104, 0.3234];
  }
  return xy;
}

module.exports = {
  connectToHue,
  getLightName,
  getLightGroupName,
  lightSceneXY,
};
