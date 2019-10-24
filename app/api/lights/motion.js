

/**
 * @api {get} /lights/scenes List all light scenes
 * @apiName scenes
 * @apiGroup Lights
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     success: 'true'
 *     data: Hue bridge API response
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 500 Internal error
 *   {
 *     data: Error message
 *   }
 *
 */
async function scenes(req, res, next) {
  try {
    serviceHelper.log('trace', 'scenes API called');
    const lights = await hue.scenes.getAll();
    const returnData = lights.filter(
      (o) => o.attributes.attributes.owner.toString()
        === '9FLuZJvC-N6WNxKvlFVOiEHEMVUPv9bS0Yx-woRL',
    );

    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, true, returnData);
      next();
    } else {
      return lights;
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
    if (typeof res !== 'undefined' && res !== null) {
      serviceHelper.sendResponse(res, false, err);
      next();
    } else {
      return err;
    }
  }
  return true;
}
skill.get('/scenes', scenes);


module.exports = {
  skill,
  list,
  // lightGroupState,
};
