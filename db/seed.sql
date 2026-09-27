-- 演示数据（测试账号密码均为明文，仅用于本地演示）
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM referrals; DELETE FROM followups; DELETE FROM discharges; DELETE FROM feedbacks;
DELETE FROM fees; DELETE FROM family_messages; DELETE FROM incident_actions; DELETE FROM incidents;
DELETE FROM visit_disinfections; DELETE FROM visits; DELETE FROM nursery_logs; DELETE FROM staff_schedules;
DELETE FROM rehab_schedules; DELETE FROM meals; DELETE FROM doctor_rounds; DELETE FROM care_records;
DELETE FROM care_plans; DELETE FROM baby_observations; DELETE FROM residents; DELETE FROM rooms;
DELETE FROM package_gifts; DELETE FROM packages; DELETE FROM sessions; DELETE FROM family_users; DELETE FROM staff;
SET FOREIGN_KEY_CHECKS = 1;

-- ============ 员工账号 ============
INSERT INTO staff (id,username,password,name,role,phone,rating,feedback_cnt) VALUES
(1,'admin','admin123','王雅芝','admin','13900000001',4.95,86),
(2,'director','dir123','李慧','director','13900000002',4.90,64),
(3,'headnurse','hn123','陈静','head_nurse','13900000003',4.88,120),
(4,'nurse','nurse123','林晓','nurse','13900000004',4.92,98),
(5,'nurse2','nurse123','赵敏','nurse','13900000005',4.30,42),
(6,'ped','ped123','周明','pediatrician','13900000006',4.97,150),
(7,'diet','diet123','吴燕','dietitian','13900000007',4.85,77),
(8,'rehab','rehab123','孙悦','rehab','13900000008',4.80,55),
(9,'nanny','nanny123','钱阿姨','nanny','13900000009',4.20,38),
(10,'front','front123','冯璐','front_desk','13900000010',4.75,60),
(11,'finance','fin123','郑凯','finance','13900000011',4.82,49);

-- ============ 家属账号 ============
INSERT INTO family_users (id,username,password,name,relation,phone,room_id,visit_level) VALUES
(1,'family1','fam123','张磊','丈夫','13800000001',1,'full'),
(2,'family2','fam123','王强','丈夫','13800000002',2,'summary');

-- ============ 套餐与赠品 ============
INSERT INTO packages (id,name,room_type,daily_price,description) VALUES
(1,'标准休养套餐','标间',680.00,'标间入住，基础月子餐与护理，每日查房'),
(2,'雅致套房套餐','套房',1080.00,'套房入住，专属月子餐、每周儿科巡诊、产后康复课程'),
(3,'VIP女王套餐','VIP',1880.00,'VIP套房，一对一月嫂、儿科医生每日巡诊、全套产康与家属陪住');

INSERT INTO package_gifts (package_id,name,qty,remark) VALUES
(1,'新生儿礼包',1,'衣物+纸尿裤'),
(1,'满月照体验券',1,'合作影楼'),
(2,'新生儿礼包',1,'衣物+纸尿裤+包被'),
(2,'产后修复体验课',2,'盆底肌/腹直肌任选'),
(2,'满月照体验券',1,'合作影楼'),
(3,'新生儿豪华礼包',1,'含安全提篮'),
(3,'全套产康课程',1,'12 节课时包'),
(3,'满月照全套',1,'含成片 20 张'),
(3,'家属陪住加床',1,'全程');

-- ============ 房间 ============
INSERT INTO rooms (id,room_no,package_id,status) VALUES
(1,'A301',2,'occupied'),
(2,'A302',1,'occupied'),
(3,'A303',3,'available'),
(4,'A201',2,'cleanup');

-- ============ 产妇入住档案 ============
INSERT INTO residents (id,room_id,name,baby_name,delivery_type,postpartum_days,checkin_date,expected_checkout,actual_checkout,allergy,feeding,diet_restriction,visit_policy,doctor_advice,status) VALUES
(1,1,'林晚','小糯米','cesarean',3,'2026-09-20','2026-10-18',NULL,'青霉素；海鲜过敏','mixed','忌辛辣、忌海鲜、忌发物','每日限 2 名家属，探访时间 15:00-17:00，感冒者禁止入内','剖宫产切口保持干燥；监测黄疸；混合喂养注意衔乳姿势；恶露量增多随诊','inhouse'),
(2,2,'苏晴','小豆包','vaginal',5,'2026-09-18','2026-10-16',NULL,'无已知过敏','breast','忌生冷、少盐少油','直系亲属 2 人，14:00-18:00','坚持纯母乳按需哺乳；生理性黄疸观察；会阴伤口每日评估','inhouse'),
(3,4,'周敏','小年糕','assisted',4,'2026-08-20','2026-09-17','2026-09-15','芒果过敏','bottle','糖尿病饮食，低糖','—','出院后监测血糖；宝宝儿保随访；产后 42 天复查','discharged');

-- ============ 宝宝观察（黄疸场景） ============
INSERT INTO baby_observations (resident_id,observed_at,weight_g,jaundice,bilirubin,note,recorder_id) VALUES
(1,'2026-09-21 09:00:00',3210,'mild',9.2,'颜面轻度黄染，吃奶正常',4),
(1,'2026-09-24 09:00:00',3260,'moderate',13.5,'黄染延及躯干，加强喂养与日光观察',4),
(1,'2026-09-26 08:30:00',3290,'high',16.8,'黄染明显、经皮胆红素升至 16.8，已通知儿科医生评估光疗',4),
(2,'2026-09-23 09:00:00',3380,'mild',10.1,'生理性黄疸范围，多吃多排',5),
(2,'2026-09-26 09:00:00',3520,'none',7.4,'黄疸消退，体重回升',5),
(3,'2026-09-14 09:00:00',3300,'none',6.9,'出所前评估正常',4);

-- ============ 护理计划 ============
INSERT INTO care_plans (id,resident_id,category,title,plan_time,assignee_id,frequency,status,note,created_by) VALUES
(1,1,'rounds','护士长每日查房','2026-09-26 10:00:00',3,'每日 1 次','planned','重点查看切口与恶露',2),
(2,1,'wound','剖宫产切口观察','2026-09-26 12:00:00',4,'每日 2 次','done','切口干燥无渗出',2),
(3,1,'breast','乳房护理/通乳','2026-09-26 15:00:00',3,'按需','planned','昨日诉右侧胀痛，疑似乳腺管堵塞',2),
(4,1,'rehab','盆底肌修复课','2026-09-26 16:00:00',8,'每周二/四','delayed','产康师临时会诊，延期至 9/27',8),
(5,1,'meal','月子餐三正餐两加餐','2026-09-26 08:00:00',7,'每日 5 餐','planned','严格避开海鲜与辛辣',7),
(6,1,'bath','宝宝洗澡与抚触','2026-09-26 11:00:00',4,'每日 1 次','done','洗澡后脐部消毒',4),
(7,1,'nightcare','夜间照护','2026-09-26 22:00:00',9,'每晚','planned','钱阿姨请假，待重新排班',2),
(8,2,'rounds','护理主管查房','2026-09-26 10:30:00',2,'每日 1 次','done','恢复良好',2),
(9,2,'breast','母乳喂养指导','2026-09-26 14:00:00',5,'每日 1 次','planned','指导衔乳与手排奶',3),
(10,2,'bath','宝宝洗澡抚触','2026-09-26 11:30:00',5,'每日 1 次','done',NULL,5),
(11,2,'nightcare','夜间托管','2026-09-26 22:00:00',9,'每晚','planned',NULL,2);

-- ============ 护理执行记录 ============
INSERT INTO care_records (plan_id,resident_id,category,content,recorded_at,recorder_id,visible_family) VALUES
(2,1,'wound','09-26 剖宫产切口对合良好，无红肿渗液，体温 36.8℃。','2026-09-26 12:10:00',4,1),
(6,1,'bath','09-26 11:00 宝宝洗澡 8 分钟，抚触 10 分钟，脐部干燥，吃奶 60ml。','2026-09-26 11:25:00',4,1),
(3,1,'breast','右侧乳房外上象限硬结、压痛，体温 37.2℃，已热敷并手法疏通，嘱多吸吮，报护士长。','2026-09-25 20:30:00',4,1),
(NULL,1,'rounds','护士长查房：精神可，乳汁排出较前通畅，继续观察体温与硬结变化。','2026-09-25 21:00:00',3,1),
(8,2,'rounds','产妇宫缩好，恶露量中，会阴伤口愈合中，无红肿。','2026-09-26 10:45:00',2,1),
(10,2,'bath','宝宝洗澡抚触完成，黄疸较前明显消退，反应好。','2026-09-26 12:00:00',5,1),
(NULL,3,'rounds','出所前总评估：母子一般情况好，嘱产后 42 天复查。','2026-09-15 10:00:00',3,0);

-- ============ 医生巡诊记录 ============
INSERT INTO doctor_rounds (resident_id,doctor_id,round_time,diagnosis,advice,next_round) VALUES
(1,6,'2026-09-22 10:00:00','剖宫产术后恢复中，新生儿生理性黄疸','按需哺乳，黄疸隔日监测；切口保持干燥','2026-09-24'),
(1,6,'2026-09-26 09:15:00','新生儿高胆红素血症风险（经皮 16.8）','建议转儿科查血清胆红素，必要时蓝光治疗；暂停接种室集中照护','2026-09-27'),
(2,6,'2026-09-23 10:30:00','纯母乳喂养，黄疸在生理性范围','继续多吃多排，每日监测','2026-09-26'),
(3,6,'2026-09-15 09:30:00','恢复良好，达到出所标准','产后 42 天复查；宝宝按时儿保',NULL);

-- ============ 月子餐 ============
INSERT INTO meals (resident_id,meal_date,slot,menu,dietitian_id,status,note) VALUES
(1,'2026-09-26','breakfast','小米粥、水煮蛋、清炒时蔬',7,'served',NULL),
(1,'2026-09-26','lunch','麻油猪肝饭、丝瓜蛋汤（无海鲜）',7,'issue','家属反馈餐中出现虾米，违反海鲜忌口，已退回重做'),
(1,'2026-09-26','dinner','山药排骨汤、糙米饭、蒸南瓜',7,'planned',NULL),
(1,'2026-09-26','snack','红枣银耳羹',7,'planned',NULL),
(2,'2026-09-26','breakfast','红糖小米粥、蒸蛋',7,'served',NULL),
(2,'2026-09-26','lunch','鲈鱼通草汤（温热）、杂粮饭',7,'served',NULL),
(2,'2026-09-26','dinner','黄芪炖鸡汤、清炒西兰花',7,'planned',NULL);

-- ============ 产康排班 ============
INSERT INTO rehab_schedules (resident_id,course_name,rehab_staff_id,start_time,end_time,status,delay_reason,rescheduled_to) VALUES
(1,'盆底肌修复',8,'2026-09-26 16:00:00',NULL,'delayed','产康师被临时安排协助手法通乳，课程顺延','2026-09-27 10:00:00'),
(1,'腹直肌分离评估',8,'2026-09-28 15:00:00',NULL,'scheduled',NULL,NULL),
(2,'产后瑜伽',8,'2026-09-27 14:00:00',NULL,'scheduled',NULL,NULL);

-- ============ 员工排班（月嫂请假 / 反馈影响排班） ============
INSERT INTO staff_schedules (staff_id,work_date,shift,room_id,remark) VALUES
(4,'2026-09-26','day',1,'负责 A301 白班护理'),
(5,'2026-09-26','day',2,'负责 A302 白班护理'),
(8,'2026-09-26','day',NULL,'产康课程与通乳支援'),
(9,'2026-09-26','night',1,'A301 夜间照护（请假前）'),
(9,'2026-09-27','leave',NULL,'家中急事请假 1 天，夜间照护需他人顶替'),
(5,'2026-09-27','day',2,'因家属投诉评分较低，本周起减少 A302 独立派单，由护士长带教'),
(4,'2026-09-27','day',1,NULL),
(3,'2026-09-27','day',1,'顶替钱阿姨兼管 A301 夜间巡视'),
(6,'2026-09-26','day',NULL,'上午巡诊 A301/A302'),
(7,'2026-09-26','day',NULL,'餐食审核与忌口把关');

-- ============ 宝宝托管日志 ============
INSERT INTO nursery_logs (resident_id,start_time,end_time,nanny_id,feeding_ml,diaper,sleep_note,status) VALUES
(1,'2026-09-25 22:00:00','2026-09-26 06:30:00',9,240,6,'夜醒 2 次，安抚后入睡，黄疸嘱多喂',  'finished'),
(1,'2026-09-26 22:00:00',NULL,NULL,NULL,NULL,'钱阿姨请假，夜间托管待安排','ongoing'),
(2,'2026-09-25 22:10:00','2026-09-26 06:40:00',9,180,5,'睡眠安稳，纯母乳亲喂 2 次','finished');

-- ============ 探访预约与消毒 ============
INSERT INTO visits (id,resident_id,family_id,visitor_name,visitor_phone,visit_date,visit_time,visitors_cnt,kind,status,approve_by,temp_reason) VALUES
(1,1,1,'张磊','13800000001','2026-09-26','15:30',1,'scheduled','checked_in',10,NULL),
(2,1,NULL,'张奶奶','13800000003','2026-09-26','18:30',1,'temporary','requested',NULL,'老人从外地赶来，想临时看一眼宝宝'),
(3,2,2,'王强','13800000002','2026-09-27','15:00',2,'scheduled','approved',10,NULL);

INSERT INTO visit_disinfections (visit_id,done_at,method,operator_id,result) VALUES
(1,'2026-09-26 15:25:00','手消+更换鞋套+体温检测',10,'pass'),
(3,'2026-09-25 16:00:00','手消+口罩+紫外线物品消毒',10,'pass');

-- ============ 异常事件（围绕同一房间协同） ============
INSERT INTO incidents (id,resident_id,room_id,type,title,description,severity,status,raised_by_type,raised_by_id,lead_role,created_at,resolved_at,resolution,dispute_to_headnurse) VALUES
(1,1,1,'jaundice','宝宝黄疸升高，经皮胆红素 16.8','09-26 晨测黄疸升至 high，需儿科评估是否蓝光，暂停集中托管。','high','processing','staff',4,'pediatrician','2026-09-26 08:45:00',NULL,NULL,0),
(2,1,1,'breast_block','产妇右侧乳腺管堵塞','右侧硬结压痛，已手法疏通，需护士长与护理主管跟进，警惕乳腺炎。','medium','processing','staff',4,'head_nurse','2026-09-25 20:40:00',NULL,NULL,0),
(3,1,1,'temp_visit','家属临时增加晚间探访','张奶奶外地赶来申请 18:30 临时探访，超出规定探访时段，需护士长与前台共同审批并安排消毒。','medium','open','family',1,'front_desk','2026-09-26 11:20:00',NULL,NULL,0),
(4,1,1,'nanny_leave','月嫂钱阿姨 9/27 请假','夜间照护出现空班，需护理主管调班、护士长顶替巡视。','medium','open','staff',9,'director','2026-09-26 09:30:00',NULL,NULL,0),
(5,1,1,'meal_violation','月子餐混入虾米违反海鲜忌口','午餐餐品发现虾米，产妇海鲜过敏，家属不满，营养师与厨房需整改并核对当餐。','high','resolved','family',1,'dietitian','2026-09-26 12:40:00','2026-09-26 13:20:00','已停餐重做，厨房增设过敏忌口红色餐标，营养师逐餐复核，对家属致歉并赠送加餐。',0),
(6,1,1,'rehab_delay','盆底肌课程临时延期','产康师支援通乳，课程由 9/26 16:00 延至 9/27 10:00，前台通知家属。','low','resolved','staff',8,'front_desk','2026-09-26 14:00:00','2026-09-26 14:30:00','已与家属确认新时间并更新产康排班。',0),
(7,2,2,'record_dispute','家属质疑护理记录与实际不符','家属认为 9/25 夜间喂奶次数记录（3 次）与宝宝哭闹情况不符，要求核查托管日志并解释。','high','open','family',2,'head_nurse','2026-09-26 09:00:00',NULL,NULL,0),
(8,1,1,'room_upgrade','申请由雅致套房升级 VIP 套餐/房间','家属希望升级到 A303 VIP 女王套餐并加床陪住，涉及房差、赠品与费用调整。','medium','resolved','family',1,'finance','2026-09-24 10:00:00','2026-09-24 16:00:00','已确认 A303 预留与每日房差 800 元，赠品按 VIP 标准发放，费用明细同步家属端。',0),
(9,3,4,'checkout_dispute','提前退所费用争议','家属认为提前 2 天退所不应收取全额房费，对产康未消费项目计费有异议，争议同步护士长。','high','escalated','family',0,'head_nurse','2026-09-15 08:30:00',NULL,NULL,1);

-- 房间升级同时是套餐升级类型的补充记录（财务关联）
INSERT INTO incidents (resident_id,room_id,type,title,description,severity,status,raised_by_type,raised_by_id,lead_role,created_at,resolved_at,resolution) VALUES
(1,1,'package_upgrade','套餐升级费用与赠品变更','雅致套房→VIP 女王套餐：核算剩余 22 天房差、追加 VIP 赠品（全套产康、豪华礼包、加床）。','medium','resolved','staff',11,'finance','2026-09-24 10:05:00','2026-09-24 16:00:00','房差 17600 元已开单，VIP 赠品已登记发放，家属线上确认。');

-- ============ 异常协同动作 ============
INSERT INTO incident_actions (incident_id,actor_id,actor_role,action,content,created_at) VALUES
(1,4,'nurse','create','晨测黄疸 high/16.8，暂停集中托管并上报。','2026-09-26 08:45:00'),
(1,6,'pediatrician','handle','已到房评估，建议查血清胆红素，若＞15 即光疗，已开转诊单。','2026-09-26 09:20:00'),
(1,3,'head_nurse','comment','安排单独房间照护，光疗设备协调中，持续告知家属。','2026-09-26 09:40:00'),
(2,4,'nurse','create','右侧乳房硬结，热敷+手法疏通。','2026-09-25 20:40:00'),
(2,3,'head_nurse','handle','复查硬结缩小，指导亲喂姿势，明早复测体温。','2026-09-25 21:10:00'),
(3,10,'front_desk','create','登记临时探访申请，待护士长评估时段与健康状况。','2026-09-26 11:25:00'),
(4,2,'director','create','收到月嫂请假，启动调班：9/27 夜间由护士长兼巡视，白班林晓加班补位。','2026-09-26 09:40:00'),
(5,7,'dietitian','resolve','停餐重做、红色过敏餐标、逐餐复核，家属接受致歉。','2026-09-26 13:20:00'),
(6,10,'front_desk','resolve','已电话告知家属改期时间并更新预约提醒。','2026-09-26 14:30:00'),
(7,3,'head_nurse','create','受理质疑，调取 9/25 托管日志与喂奶记录核对。','2026-09-26 09:10:00'),
(7,2,'director','comment','请当事月嫂书面说明，护理主管旁听，处理结果回传家属。','2026-09-26 09:30:00'),
(8,11,'finance','create','核算房差 22 天 × 800 = 17600 元，赠品差额登记。','2026-09-24 10:30:00'),
(8,10,'front_desk','approve','A303 预留 9/28 可入住，加床安排确认。','2026-09-24 11:00:00'),
(8,11,'finance','resolve','家属线上确认费用与赠品，等待 9/28 换房。','2026-09-24 16:00:00'),
(9,3,'head_nurse','escalate','退所费用争议升级，护士长牵头核对未消费产康课时与提前退所条款。','2026-09-15 09:00:00'),
(9,11,'finance','handle','出具费用明细：未消费产康 2 节退费 960 元，提前退所按合同收 1 天违约金。','2026-09-15 10:00:00');

-- ============ 家属沟通 ============
INSERT INTO family_messages (resident_id,sender_type,sender_id,content,created_at) VALUES
(1,'staff',3,'宝宝黄疸今天略高，周医生已来看过，建议查一下血胆红素，有进展随时同步您。','2026-09-26 09:25:00'),
(1,'family',1,'谢谢，需要我们签知情同意书请发我，光疗我们同意。','2026-09-26 09:50:00'),
(1,'staff',10,'盆底肌课改到明天上午 10 点，给您带来不便很抱歉。','2026-09-26 14:35:00'),
(2,'family',2,'昨晚明明哭了很久，你们记录只喂了 3 次，请给个说法。','2026-09-26 08:55:00'),
(2,'staff',3,'已受理您的疑问，正在调取托管室监控和喂奶记录，今天上午给您书面答复。','2026-09-26 09:15:00');

-- ============ 费用明细 ============
INSERT INTO fees (resident_id,item_name,fee_type,amount,occur_date,status,incident_id,created_by) VALUES
(1,'雅致套房套餐房费（9/20-9/27，8 天）','package',8640.00,'2026-09-20','paid',NULL,11),
(1,'套餐升级房差（9/28 起 22 天 × 800）','upgrade',17600.00,'2026-09-24','unpaid',8,11),
(1,'追加全套产康课时包（VIP 赠品）','gift',0.00,'2026-09-24','paid',10,11),
(1,'月子餐（含忌口特供）','meal',0.00,'2026-09-26','paid',NULL,7),
(1,'新生儿豪华礼包（VIP 赠品）','gift',0.00,'2026-09-24','paid',10,11),
(2,'标准套餐房费（9/18-9/26，9 天）','package',6120.00,'2026-09-18','paid',NULL,11),
(2,'产后瑜伽加课 2 节','rehab',480.00,'2026-09-25','unpaid',NULL,11),
(3,'雅致套房套餐房费（8/20-9/15，27 天）','package',29160.00,'2026-08-20','paid',NULL,11),
(3,'未消费产康课 2 节退费','refund',-960.00,'2026-09-15','refunded',9,11),
(3,'提前退所违约金（1 天房费）','other',1080.00,'2026-09-15','paid',9,11);

-- ============ 家属反馈（影响口碑与排班） ============
INSERT INTO feedbacks (resident_id,family_id,target_staff_id,score,content,tags,schedule_impact,created_at) VALUES
(1,1,4,5,'林晓护理师非常细心，发现黄疸和堵奶都处理及时，特别安心。','表扬;专业;沟通好','优先派 A301，列入带教护理师',  '2026-09-26 13:00:00'),
(2,2,5,2,'夜间记录与实际情况对不上，回应也比较敷衍，希望换人。','投诉;记录存疑;态度','本周减少独立派单，护士长带教复核，暂不安排夜间独立值守','2026-09-26 10:30:00'),
(3,NULL,9,3,'月嫂夜里响应不够快，但白天照顾还可以。','投诉;响应慢','夜间班次改为双人搭班','2026-09-14 18:00:00');

-- ============ 出所归档 ============
INSERT INTO discharges (resident_id,checkout_date,total_amount,paid_amount,refund_amount,followup_advice,handled_by) VALUES
(3,'2026-09-15',30240.00,29280.00,960.00,'1. 产妇产后 42 天复查血糖与盆底；2. 宝宝按时接种与儿保，关注体重增长；3. 建议 2 周后电话随访哺乳与睡眠。',3);

-- ============ 出所后母婴随访（护理记录延续） ============
INSERT INTO followups (resident_id,plan_date,done_at,mother_note,baby_note,status,staff_id) VALUES
(3,'2026-09-29',NULL,NULL,NULL,'planned',4),
(3,'2026-10-13',NULL,NULL,NULL,'planned',4),
(3,'2026-09-15','2026-09-15 15:00:00','出所时恶露正常，切口愈合好，血糖控制平稳。','出所评估黄疸正常、体重 3300g，嘱儿保随访。','done',3);

-- ============ 复购 / 转介绍线索 ============
INSERT INTO referrals (resident_id,kind,contact_name,contact_phone,note,status,created_at) VALUES
(3,'referral','刘女士（周敏闺蜜，预产期 12 月）','13700000001','对护理总体满意，介绍闺蜜来看套房，已约 10 月参观。','contacted','2026-09-16 10:00:00'),
(3,'repurchase','周敏（二胎计划）','13700000002','表示二胎仍考虑本中心，关注 VIP 套餐老客折扣。','lead','2026-09-16 10:05:00');
