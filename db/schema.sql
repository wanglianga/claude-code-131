-- 月子中心产妇护理计划与家属探访平台 数据库结构
-- MySQL / MariaDB 兼容

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS
  referrals, followups, discharges, feedbacks, fees, family_messages,
  incident_actions, incidents, visit_disinfections, visits, nursery_logs,
  staff_schedules, rehab_schedules, meals, doctor_rounds, care_records, care_plans,
  baby_observations, residents, rooms, package_gifts, packages, sessions, family_users, staff;

-- 员工（护理师/护士长/护理主管/儿科医生/营养师/产康师/月嫂/前台/财务/管理者）
CREATE TABLE staff (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(64) NOT NULL UNIQUE,
  password      VARCHAR(128) NOT NULL,
  name          VARCHAR(64) NOT NULL,
  role          ENUM('admin','director','head_nurse','nurse','pediatrician','dietitian','rehab','nanny','front_desk','finance') NOT NULL,
  phone         VARCHAR(32),
  rating        DECIMAL(3,2) NOT NULL DEFAULT 5.00 COMMENT '口碑评分，受家属反馈影响',
  feedback_cnt  INT NOT NULL DEFAULT 0,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 家属账号（按房间授权）
CREATE TABLE family_users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  username    VARCHAR(64) NOT NULL UNIQUE,
  password    VARCHAR(128) NOT NULL,
  name        VARCHAR(64) NOT NULL,
  relation    VARCHAR(32) NOT NULL COMMENT '与产妇关系',
  phone       VARCHAR(32),
  room_id     INT,
  visit_level ENUM('full','summary','none') NOT NULL DEFAULT 'summary' COMMENT '护理信息查看授权',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 登录会话
CREATE TABLE sessions (
  token       CHAR(40) PRIMARY KEY,
  principal_type ENUM('staff','family') NOT NULL,
  principal_id INT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 房型套餐
CREATE TABLE packages (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(64) NOT NULL,
  room_type     VARCHAR(32) NOT NULL COMMENT '房型：标间/套房/VIP',
  daily_price   DECIMAL(10,2) NOT NULL,
  description   VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 套餐赠品
CREATE TABLE package_gifts (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  package_id  INT NOT NULL,
  name        VARCHAR(128) NOT NULL,
  qty         INT NOT NULL DEFAULT 1,
  remark      VARCHAR(255),
  FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 房间
CREATE TABLE rooms (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  room_no     VARCHAR(16) NOT NULL UNIQUE,
  package_id  INT,
  status      ENUM('occupied','cleanup','available') NOT NULL DEFAULT 'available',
  FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 产妇入住档案
CREATE TABLE residents (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  room_id          INT NOT NULL,
  name             VARCHAR(64) NOT NULL,
  baby_name        VARCHAR(64) NOT NULL,
  delivery_type    ENUM('vaginal','cesarean','assisted') NOT NULL COMMENT '顺产/剖宫产/助产',
  postpartum_days  INT NOT NULL COMMENT '入住时产后天数',
  checkin_date     DATE NOT NULL,
  expected_checkout DATE NOT NULL,
  actual_checkout  DATE,
  allergy          VARCHAR(500) COMMENT '过敏史',
  feeding          ENUM('breast','bottle','mixed') NOT NULL COMMENT '哺乳方式：母乳/奶瓶/混合',
  diet_restriction VARCHAR(500) COMMENT '餐食禁忌',
  visit_policy     VARCHAR(255) COMMENT '家属探访权限说明',
  doctor_advice    TEXT COMMENT '医生建议',
  status           ENUM('inhouse','discharged') NOT NULL DEFAULT 'inhouse',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 宝宝观察记录（体重、黄疸）
CREATE TABLE baby_observations (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  observed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  weight_g     INT COMMENT '体重(克)',
  jaundice     ENUM('none','mild','moderate','high') NOT NULL DEFAULT 'none' COMMENT '黄疸程度',
  bilirubin    DECIMAL(5,1) COMMENT '经皮胆红素 mg/dL',
  note         VARCHAR(500),
  recorder_id  INT COMMENT '记录护理师',
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (recorder_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 护理计划（查房/伤口观察/乳房护理/产康课程/月子餐/宝宝洗澡抚触/夜间照护）
CREATE TABLE care_plans (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  resident_id   INT NOT NULL,
  category      ENUM('rounds','wound','breast','rehab','meal','bath','nightcare') NOT NULL,
  title         VARCHAR(128) NOT NULL,
  plan_time     DATETIME,
  assignee_id   INT COMMENT '负责员工',
  frequency     VARCHAR(64) COMMENT '频次，如每日3次',
  status        ENUM('planned','done','delayed','cancelled') NOT NULL DEFAULT 'planned',
  note          VARCHAR(500),
  created_by    INT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (assignee_id) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 护理执行记录
CREATE TABLE care_records (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  plan_id      INT,
  resident_id  INT NOT NULL,
  category     VARCHAR(32) NOT NULL,
  content      TEXT NOT NULL,
  recorded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorder_id  INT NOT NULL,
  visible_family TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否进入家属可见摘要',
  FOREIGN KEY (plan_id) REFERENCES care_plans(id),
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (recorder_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 医生巡诊记录
CREATE TABLE doctor_rounds (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  doctor_id    INT NOT NULL,
  round_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diagnosis    VARCHAR(500) NOT NULL,
  advice       TEXT,
  next_round   DATE COMMENT '建议下次巡诊',
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (doctor_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 月子餐排餐
CREATE TABLE meals (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  meal_date    DATE NOT NULL,
  slot         ENUM('breakfast','lunch','dinner','snack') NOT NULL,
  menu         VARCHAR(300) NOT NULL,
  dietitian_id INT,
  status       ENUM('planned','served','issue') NOT NULL DEFAULT 'planned',
  note         VARCHAR(300),
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (dietitian_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 产康项目与排班
CREATE TABLE rehab_schedules (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  course_name  VARCHAR(128) NOT NULL COMMENT '产康课程/项目',
  rehab_staff_id INT COMMENT '产康师',
  start_time   DATETIME NOT NULL,
  end_time     DATETIME,
  status       ENUM('scheduled','done','delayed','cancelled') NOT NULL DEFAULT 'scheduled',
  delay_reason VARCHAR(300),
  rescheduled_to DATETIME,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (rehab_staff_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 员工排班（含月嫂请假，家属反馈影响护理师排班）
CREATE TABLE staff_schedules (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  staff_id    INT NOT NULL,
  work_date   DATE NOT NULL,
  shift       ENUM('day','night','off','leave') NOT NULL,
  room_id     INT COMMENT '负责房间',
  remark      VARCHAR(255) COMMENT '请假事由/排班备注',
  UNIQUE KEY uq_staff_date (staff_id, work_date),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 宝宝托管日志
CREATE TABLE nursery_logs (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  start_time   DATETIME NOT NULL,
  end_time     DATETIME,
  nanny_id     INT COMMENT '值班月嫂',
  feeding_ml   INT COMMENT '喂奶量 ml',
  diaper       INT COMMENT '换尿布次数',
  sleep_note   VARCHAR(300),
  status       ENUM('ongoing','finished') NOT NULL DEFAULT 'ongoing',
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (nanny_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 家属探访预约（含临时增加）
CREATE TABLE visits (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  resident_id   INT NOT NULL,
  family_id     INT,
  visitor_name  VARCHAR(64) NOT NULL,
  visitor_phone VARCHAR(32),
  visit_date    DATE NOT NULL,
  visit_time    VARCHAR(16) NOT NULL,
  visitors_cnt  INT NOT NULL DEFAULT 1,
  kind          ENUM('scheduled','temporary') NOT NULL DEFAULT 'scheduled' COMMENT '常规预约/临时增加',
  status        ENUM('requested','approved','rejected','checked_in','finished') NOT NULL DEFAULT 'requested',
  approve_by    INT,
  temp_reason   VARCHAR(300) COMMENT '临时探访事由',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (family_id) REFERENCES family_users(id),
  FOREIGN KEY (approve_by) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 探访消毒记录
CREATE TABLE visit_disinfections (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  visit_id    INT NOT NULL,
  done_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method      VARCHAR(128) NOT NULL COMMENT '消毒方式：手消/鞋套/紫外线等',
  operator_id INT,
  result      ENUM('pass','fail') NOT NULL DEFAULT 'pass',
  FOREIGN KEY (visit_id) REFERENCES visits(id),
  FOREIGN KEY (operator_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 异常事件（黄疸升高/乳腺堵塞/临时探访/月嫂请假/餐食忌口/产康延期/套餐升级/退所/质疑记录/退所争议）
CREATE TABLE incidents (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  resident_id   INT NOT NULL,
  room_id       INT NOT NULL,
  type          ENUM('jaundice','breast_block','temp_visit','nanny_leave','meal_violation',
                      'rehab_delay','package_upgrade','room_upgrade','early_checkout',
                      'record_dispute','checkout_dispute','other') NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  severity      ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status        ENUM('open','processing','resolved','closed','escalated') NOT NULL DEFAULT 'open',
  raised_by_type ENUM('staff','family') NOT NULL DEFAULT 'staff',
  raised_by_id  INT,
  lead_role     ENUM('nurse','head_nurse','pediatrician','dietitian','front_desk','finance','director','admin') NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   DATETIME,
  resolution    TEXT,
  dispute_to_headnurse TINYINT(1) NOT NULL DEFAULT 0 COMMENT '退所争议同步护士长',
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 异常协同处置（多角色围绕同一房间流转）
CREATE TABLE incident_actions (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  incident_id  INT NOT NULL,
  actor_id     INT NOT NULL,
  actor_role   VARCHAR(20) NOT NULL,
  action       VARCHAR(32) NOT NULL COMMENT 'create/assign/handle/approve/escalate/resolve/comment',
  content      TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES incidents(id),
  FOREIGN KEY (actor_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 家属沟通（围绕房间）
CREATE TABLE family_messages (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  sender_type  ENUM('staff','family') NOT NULL,
  sender_id    INT NOT NULL,
  content      VARCHAR(1000) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 费用明细
CREATE TABLE fees (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  item_name    VARCHAR(128) NOT NULL,
  fee_type     ENUM('package','upgrade','rehab','meal','gift','medical','refund','other') NOT NULL,
  amount       DECIMAL(10,2) NOT NULL COMMENT '正数收费，负数退款',
  occur_date   DATE NOT NULL,
  status       ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  incident_id  INT COMMENT '关联异常（升级/退所等）',
  created_by   INT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 家属反馈（影响护理师排班与口碑）
CREATE TABLE feedbacks (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  family_id    INT,
  target_staff_id INT,
  score        TINYINT NOT NULL COMMENT '1-5 分',
  content      VARCHAR(1000),
  tags         VARCHAR(255) COMMENT '表扬/投诉标签',
  schedule_impact VARCHAR(300) COMMENT '排班处理：减班/调房/优先派单',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (family_id) REFERENCES family_users(id),
  FOREIGN KEY (target_staff_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 出所归档（保留护理计划、异常记录、结算、回访建议）
CREATE TABLE discharges (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  resident_id     INT NOT NULL UNIQUE,
  checkout_date   DATE NOT NULL,
  total_amount    DECIMAL(12,2) NOT NULL,
  paid_amount     DECIMAL(12,2) NOT NULL,
  refund_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  followup_advice TEXT COMMENT '回访建议',
  archived_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_by      INT,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (handled_by) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 出所后母婴随访
CREATE TABLE followups (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  plan_date    DATE NOT NULL COMMENT '计划随访日期',
  done_at      DATETIME,
  mother_note  VARCHAR(500) COMMENT '产妇恢复',
  baby_note    VARCHAR(500) COMMENT '宝宝情况（含护理记录延续）',
  status       ENUM('planned','done','missed') NOT NULL DEFAULT 'planned',
  staff_id     INT,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 复购 / 转介绍线索
CREATE TABLE referrals (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  resident_id  INT NOT NULL,
  kind         ENUM('repurchase','referral') NOT NULL,
  contact_name VARCHAR(64) NOT NULL,
  contact_phone VARCHAR(32),
  note         VARCHAR(500),
  status       ENUM('lead','contacted','won','lost') NOT NULL DEFAULT 'lead',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
