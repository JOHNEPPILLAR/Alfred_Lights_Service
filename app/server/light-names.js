/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const lightsHelper = require('../api/lights/lights.js');
const lightGroupsHelper = require('../api/lights/light-groups.js');

exports.setup = () => {
  serviceHelper.log('trace', 'Setting up light/light group names');

  Promise.all([lightsHelper.list(), lightGroupsHelper.list()])
    .then(([listLights, listLightGroups]) => {
      // Setup light names
      try {
        if (listLights instanceof Error) {
          serviceHelper.log('error', listLights.message);
        } else {
          listLights.forEach((value) => {
            global.lightNames.push({
              id: value.attributes.attributes.id,
              name: value.attributes.attributes.name,
            });
          });
        }
      } catch (err) {
        serviceHelper.log('error', err.message);
      }

      // Setup light group names
      try {
        if (listLightGroups instanceof Error) {
          serviceHelper.log('error', listLightGroups.message);
        } else {
          listLightGroups.forEach((value) => {
            global.lightGroupNames.push({
              id: value.attributes.attributes.id,
              name: value.attributes.attributes.name,
            });
          });
        }
      } catch (err) {
        serviceHelper.log('error', err.message);
      }
    })
    .catch((err) => {
      serviceHelper.log('error', err.message);
    });
};
