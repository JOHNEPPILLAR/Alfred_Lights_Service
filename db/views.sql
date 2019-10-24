CREATE VIEW vw_lights_on_schedules AS
SELECT 
   light_schedules.name,
   light_schedules.hour,
   light_schedules.minute,
   light_schedules.light_group_number,
   light_schedules.brightness,
   light_schedules.scene,
   light_schedules.color_loop,
   light_schedules.ai_override
FROM light_schedules
WHERE light_schedules.type = 1 AND light_schedules.active = TRUE
