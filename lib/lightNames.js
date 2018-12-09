/**
 * Import helper libraries
 */
const serviceHelper = require('../lib/helper.js');
const lightsHelper = require('../api/lights/lights.js');
const sensors = require('../sensors/controller.js');

exports.setup = () => {
  serviceHelper.log('trace', 'setup', 'Setting up light/light group names');

  Promise.all([lightsHelper.listLights(), lightsHelper.listLightGroups()])
    .then(([listLights, listLightGroups]) => {
      // Setup light names
      if (listLights instanceof Error) {
        serviceHelper.log('error', 'setup', listLights.message);
      } else {
        listLights.forEach((value) => {
          global.lightNames.push({
            id: value.attributes.attributes.id,
            name: value.attributes.attributes.name,
          });
        });
      }

      // Setup ligh group names
      if (listLightGroups instanceof Error) {
        serviceHelper.log('error', 'setup', listLightGroups.message);
      } else {
        listLightGroups.forEach((value) => {
          global.lightGroupNames.push({
            id: value.attributes.attributes.id,
            name: value.attributes.attributes.name,
          });
        });
      }

      sensors.setup(); // Setup sensors now that we have the names of the lights and light groups
    })
    .catch((err) => {
      serviceHelper.log('error', 'setup', err.message);
    });
};
