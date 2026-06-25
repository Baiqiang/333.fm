-- Create a new on-going boss endless competition with a random alias.
-- Enum values:
-- competitions.type = 2 => ENDLESS
-- competitions.sub_type = 1 => BOSS_CHALLENGE
-- competitions.format = 1 => BO1
-- competitions.status = 1 => ON_GOING
-- challenges.type = 1 => BOSS

START TRANSACTION;

SET @alias = CONCAT('boss-', DATE_FORMAT(NOW(), '%Y%m%d-%H%i%s'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
SET @name = CONCAT('Boss ', @alias);

INSERT INTO `competitions` (
  `alias`,
  `type`,
  `sub_type`,
  `format`,
  `name`,
  `start_time`,
  `end_time`,
  `status`,
  `user_id`,
  `league_season_id`,
  `wca_competition_id`,
  `created_at`,
  `updated_at`
)
VALUES (
  @alias,
  2,
  1,
  1,
  @name,
  NOW(),
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  1,
  1,
  NULL,
  NULL,
  NOW(),
  NOW()
);

SET @competition_id = LAST_INSERT_ID();
SET @initial_hp = 70 + FLOOR(RAND() * 41);

INSERT INTO `scrambles` (
  `number`,
  `scramble`,
  `round_number`,
  `verified`,
  `submitted_by_id`,
  `competition_id`,
  `current_hp`,
  `initial_hp`,
  `created_at`,
  `updated_at`
)
VALUES (
  1,
  'R2 D U2 L F B2 R'' D R'' B2 D2 U F2 U'' F2 B'' F'' L'' F2 L''',
  1,
  1,
  NULL,
  @competition_id,
  @initial_hp,
  @initial_hp,
  NOW(),
  NOW()
);

INSERT INTO `challenges` (`competition_id`, `type`, `start_level`, `end_level`, `levels`, `challenge`, `created_at`, `updated_at`)
SELECT
  @competition_id,
  rules.challenge_type,
  rules.start_level,
  rules.end_level,
  rules.levels,
  JSON_OBJECT(
    'instantKill', rules.instant_kill,
    'minHitPoints', rules.min_hit_points,
    'maxHitPoints', rules.max_hit_points
  ),
  NOW(),
  NOW()
FROM (
  SELECT 1 AS sort_order, 1 AS challenge_type, 1 AS start_level, 9 AS end_level, CAST(NULL AS JSON) AS levels, 2400 AS instant_kill, 70 AS min_hit_points, 110 AS max_hit_points
  UNION ALL
  SELECT 2, 1, NULL, NULL, JSON_ARRAY(10), 2200, 180, 260
  UNION ALL
  SELECT 3, 1, 11, 19, CAST(NULL AS JSON), 2300, 90, 130
  UNION ALL
  SELECT 4, 1, NULL, NULL, JSON_ARRAY(20), 2200, 220, 320
  UNION ALL
  SELECT 5, 1, 21, 29, CAST(NULL AS JSON), 2300, 110, 160
  UNION ALL
  SELECT 6, 1, NULL, NULL, JSON_ARRAY(30), 2200, 260, 380
  UNION ALL
  SELECT 7, 1, 31, 39, CAST(NULL AS JSON), 2300, 130, 190
  UNION ALL
  SELECT 8, 1, NULL, NULL, JSON_ARRAY(40), 2100, 320, 450
  UNION ALL
  SELECT 9, 1, 41, 49, CAST(NULL AS JSON), 2200, 150, 210
  UNION ALL
  SELECT 10, 1, NULL, NULL, JSON_ARRAY(50), 2100, 380, 540
  UNION ALL
  SELECT 11, 1, 51, 59, CAST(NULL AS JSON), 2200, 170, 230
  UNION ALL
  SELECT 12, 1, NULL, NULL, JSON_ARRAY(60), 2100, 450, 630
  UNION ALL
  SELECT 13, 1, 61, 69, CAST(NULL AS JSON), 2200, 190, 250
  UNION ALL
  SELECT 14, 1, NULL, NULL, JSON_ARRAY(70), 2000, 540, 760
  UNION ALL
  SELECT 15, 1, 71, 79, CAST(NULL AS JSON), 2100, 210, 280
  UNION ALL
  SELECT 16, 1, NULL, NULL, JSON_ARRAY(80), 2000, 650, 900
  UNION ALL
  SELECT 17, 1, 81, 89, CAST(NULL AS JSON), 2100, 230, 310
  UNION ALL
  SELECT 18, 1, NULL, NULL, JSON_ARRAY(90), 1900, 780, 1080
  UNION ALL
  SELECT 19, 1, 91, 99, CAST(NULL AS JSON), 2100, 250, 340
  UNION ALL
  SELECT 20, 1, NULL, NULL, JSON_ARRAY(100), 1900, 900, 1250
) rules
ORDER BY rules.sort_order;

SELECT @competition_id AS competition_id, @alias AS alias, @name AS name;

COMMIT;
