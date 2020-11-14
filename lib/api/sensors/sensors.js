/**
 * @type get
 * @path /sensors
 */
async function sensors(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - List all motion sensors API called`,
  );

  try {
    const hueData = this.sensorData.filter(
      (o) => o.type === 'ZLLPresence' || o.type === 'ZLLLightLevel',
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

module.exports = {
  sensors,
};
