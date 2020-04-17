CREATE TABLE sensor_schedules (
  id                 SERIAL             PRIMARY KEY,
  sensor_ID          INT                NOT NULL,
  start_time         TEXT               NOT NULL,
  end_time           TEXT               NOT NULL,
  light_group_number INT                NOT NULL,
  brightness         INT                NOT NULL,
  scene              INT                NULL,  
  turn_off           TEXT               NOT NULL DEFAULT 'TRUE',
  active             BOOLEAN            NOT NULL DEFAULT TRUE
)

CREATE TABLE light_schedules (
  id                 SERIAL            PRIMARY KEY,
  type               INT               NOT NULL,
  name               TEXT              NOT NULL,
  hour               INT               NOT NULL,
  minute             INT               NOT NULL,
  ai_override        BOOLEAN           NOT NULL DEFAULT FALSE,
  active             BOOLEAN           NOT NULL DEFAULT TRUE,
  light_group_number INT               ,
  brightness         INT               ,
  scene              INT               ,
  color_loop         BOOLEAN           DEFAULT FALSE
)