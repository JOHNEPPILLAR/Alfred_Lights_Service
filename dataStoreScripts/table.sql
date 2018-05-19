CREATE TABLE sensor_settings (
  id                  SERIAL             PRIMARY KEY,
  sensor_id           INT                NOT NULL,
  start_time          TEXT               NOT NULL,
  end_time            TEXT               NOT NULL,
  light_group_number  INT                NOT NULL,
  light_action        TEXT               NOT NULL,
  brightness          INT                NOT NULL,
  ct                  INT                NULL,  
  turn_off            TEXT               NOT NULL DEFAULT 'TRUE',
  active              BOOLEAN            NOT NULL DEFAULT TRUE
)