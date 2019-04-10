/**
 * Import helper libraries
 */
const serviceHelper = require('../lib/helper.js');
const lightsHelper = require('../api/lights/lights.js');
const sensors = require('../sensors/controller.js');

exports.setup = () => {
  serviceHelper.log('trace', 'Setting up light/light group names');

  Promise.all([lightsHelper.listLights(), lightsHelper.listLightGroups()])
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

      // Setup ligh group names
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

      sensors.setup(); // Setup sensors now that we have the names of the lights and light groups
    })
    .catch((err) => {
      serviceHelper.log('error', err.message);
    });
};
