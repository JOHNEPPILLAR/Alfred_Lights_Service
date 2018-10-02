CREATE TABLE sensorsettings (
  id                  SERIAL             PRIMARY KEY,
  sensorID           INT                NOT NULL,
  startTime          TEXT               NOT NULL,
  endTime            TEXT               NOT NULL,
  lightGroupNumber  INT                NOT NULL,
  lightAction        TEXT               NOT NULL,
  brightness          INT                NOT NULL,
  scene               INT                NULL,  
  turnOff            TEXT               NOT NULL DEFAULT 'TRUE',
  active              BOOLEAN            NOT NULL DEFAULT TRUE
)