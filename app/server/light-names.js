/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const lightsHelper = require('../api/lights/lights.js');
const lightGroupsHelper = require('../api/lights/light-groups.js');

exports.setup = async () => {
  serviceHelper.log('trace', 'Setting up light/light group names');

  try {
    // Setup light names
    const lightNameData = await lightsHelper.list();
    if (lightNameData instanceof Error) {
      serviceHelper.log('error', lightNameData.message);
    } else {
      lightNameData.map((value) => global.lightNames.push({
        id: value.attributes.attributes.id,
        name: value.attributes.attributes.name,
      }));
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }

  // Setup light group names
  try {
    const lightGroupNameData = await lightGroupsHelper.list();
    if (lightGroupNameData instanceof Error) {
      serviceHelper.log('error', lightGroupNameData.message);
    } else {
      lightGroupNameData.map((value) => global.lightGroupNames.push({
        id: value.attributes.attributes.id,
        name: value.attributes.attributes.name,
      }));
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
  return true;
};
