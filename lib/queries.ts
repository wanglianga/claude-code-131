import { query, queryOne } from "./db";

/** 房间总览：管理者按房间看护理动作/家属沟通/费用/异常 */
export async function getRoomOverview() {
  return query<any>(`
    SELECT r.id AS room_id, r.room_no, r.status AS room_status,
           p.name AS package_name, p.room_type,
           res.id AS resident_id, res.name AS mother, res.baby_name, res.delivery_type,
           res.postpartum_days, res.feeding, res.checkin_date, res.expected_checkout,
           res.status AS resident_status,
           (SELECT COUNT(*) FROM incidents i WHERE i.room_id = r.id AND i.status IN ('open','processing','escalated')) AS open_incidents,
           (SELECT COUNT(*) FROM incidents i WHERE i.room_id = r.id AND i.severity='high' AND i.status IN ('open','processing','escalated')) AS high_incidents,
           (SELECT COUNT(*) FROM care_records cr WHERE cr.resident_id = res.id AND DATE(cr.recorded_at)=CURDATE()) AS today_records,
           (SELECT COUNT(*) FROM family_messages m WHERE m.resident_id = res.id AND DATE(m.created_at)=CURDATE()) AS today_msgs,
           (SELECT COALESCE(SUM(f.amount),0) FROM fees f WHERE f.resident_id = res.id AND f.status='unpaid') AS unpaid_amount,
           (SELECT bo.jaundice FROM baby_observations bo WHERE bo.resident_id = res.id ORDER BY bo.observed_at DESC LIMIT 1) AS last_jaundice
    FROM rooms r
    LEFT JOIN packages p ON p.id = r.package_id
    LEFT JOIN residents res ON res.room_id = r.id AND res.status='inhouse'
    ORDER BY r.room_no`);
}

export async function getRoomDetail(roomId: number) {
  const room = await queryOne<any>(
    `SELECT r.*, p.name AS package_name, p.room_type, p.daily_price
     FROM rooms r LEFT JOIN packages p ON p.id=r.package_id WHERE r.id=?`, [roomId]);
  if (!room) return null;
  const resident = await queryOne<any>(
    `SELECT res.*, DATEDIFF(CURDATE(), res.checkin_date) + res.postpartum_days AS days_now
     FROM residents res WHERE res.room_id=? ORDER BY res.id DESC LIMIT 1`, [roomId]);
  const [plans, records, observations, rounds, meals, rehabs, nursery, visits, incidents, fees, messages, feedbacks, family] =
    await Promise.all([
      resident ? query<any>(`SELECT cp.*, s.name AS assignee FROM care_plans cp LEFT JOIN staff s ON s.id=cp.assignee_id WHERE cp.resident_id=? ORDER BY cp.plan_time DESC LIMIT 30`, [resident.id]) : [],
      resident ? query<any>(`SELECT cr.*, s.name AS recorder FROM care_records cr JOIN staff s ON s.id=cr.recorder_id WHERE cr.resident_id=? ORDER BY cr.recorded_at DESC LIMIT 30`, [resident.id]) : [],
      resident ? query<any>(`SELECT bo.*, s.name AS recorder FROM baby_observations bo LEFT JOIN staff s ON s.id=bo.recorder_id WHERE bo.resident_id=? ORDER BY bo.observed_at DESC LIMIT 10`, [resident.id]) : [],
      resident ? query<any>(`SELECT dr.*, s.name AS doctor FROM doctor_rounds dr JOIN staff s ON s.id=dr.doctor_id WHERE dr.resident_id=? ORDER BY dr.round_time DESC LIMIT 10`, [resident.id]) : [],
      resident ? query<any>(`SELECT m.*, s.name AS dietitian FROM meals m LEFT JOIN staff s ON s.id=m.dietitian_id WHERE m.resident_id=? ORDER BY m.meal_date DESC, FIELD(m.slot,'breakfast','lunch','dinner','snack') LIMIT 20`, [resident.id]) : [],
      resident ? query<any>(`SELECT rs.*, s.name AS rehab_name FROM rehab_schedules rs LEFT JOIN staff s ON s.id=rs.rehab_staff_id WHERE rs.resident_id=? ORDER BY rs.start_time DESC LIMIT 10`, [resident.id]) : [],
      resident ? query<any>(`SELECT nl.*, s.name AS nanny FROM nursery_logs nl LEFT JOIN staff s ON s.id=nl.nanny_id WHERE nl.resident_id=? ORDER BY nl.start_time DESC LIMIT 10`, [resident.id]) : [],
      resident ? query<any>(`SELECT v.*, fu.name AS family_name FROM visits v LEFT JOIN family_users fu ON fu.id=v.family_id WHERE v.resident_id=? ORDER BY v.visit_date DESC, v.id DESC LIMIT 15`, [resident.id]) : [],
      query<any>(`SELECT i.*, (SELECT COUNT(*) FROM incident_actions a WHERE a.incident_id=i.id) AS action_cnt FROM incidents i WHERE i.room_id=? ORDER BY i.created_at DESC LIMIT 20`, [roomId]),
      resident ? query<any>(`SELECT * FROM fees WHERE resident_id=? ORDER BY occur_date DESC, id DESC LIMIT 30`, [resident.id]) : [],
      resident ? query<any>(`SELECT m.*, CASE m.sender_type WHEN 'staff' THEN (SELECT name FROM staff WHERE id=m.sender_id) ELSE (SELECT name FROM family_users WHERE id=m.sender_id) END AS sender_name FROM family_messages m WHERE m.resident_id=? ORDER BY m.created_at DESC LIMIT 30`, [resident.id]) : [],
      resident ? query<any>(`SELECT fb.*, s.name AS staff_name, fu.name AS family_name FROM feedbacks fb LEFT JOIN staff s ON s.id=fb.target_staff_id LEFT JOIN family_users fu ON fu.id=fb.family_id WHERE fb.resident_id=? ORDER BY fb.created_at DESC LIMIT 10`, [resident.id]) : [],
      resident ? query<any>(`SELECT id, name, relation, visit_level FROM family_users WHERE room_id=?`, [roomId]) : [],
    ]);
  const gifts = room.package_id
    ? await query<any>(`SELECT * FROM package_gifts WHERE package_id=?`, [room.package_id])
    : [];
  return { room, resident, plans, records, observations, rounds, meals, rehabs, nursery, visits, incidents, fees, messages, feedbacks, family, gifts };
}

export async function getIncident(id: number) {
  const incident = await queryOne<any>(
    `SELECT i.*, r.room_no, res.name AS mother, res.baby_name
     FROM incidents i JOIN rooms r ON r.id=i.room_id JOIN residents res ON res.id=i.resident_id WHERE i.id=?`, [id]);
  if (!incident) return null;
  const actions = await query<any>(
    `SELECT a.*, s.name AS actor_name FROM incident_actions a JOIN staff s ON s.id=a.actor_id WHERE a.incident_id=? ORDER BY a.created_at`, [id]);
  return { incident, actions };
}

export async function listIncidents(filter: { status?: string; roomId?: number } = {}) {
  const cond: string[] = [];
  const params: any[] = [];
  if (filter.status && filter.status !== "all") { cond.push("i.status=?"); params.push(filter.status); }
  if (filter.roomId) { cond.push("i.room_id=?"); params.push(filter.roomId); }
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
  return query<any>(
    `SELECT i.*, r.room_no, res.name AS mother, res.baby_name,
       (SELECT COUNT(*) FROM incident_actions a WHERE a.incident_id=i.id) AS action_cnt
     FROM incidents i JOIN rooms r ON r.id=i.room_id JOIN residents res ON res.id=i.resident_id
     ${where} ORDER BY FIELD(i.status,'escalated','open','processing','resolved','closed'), i.created_at DESC LIMIT 100`, params);
}

export async function getMyTasks(staffId: number, role: string) {
  const plans = await query<any>(
    `SELECT cp.*, res.name AS mother, res.baby_name, r.room_no, r.id AS room_id
     FROM care_plans cp JOIN residents res ON res.id=cp.resident_id JOIN rooms r ON r.id=res.room_id
     WHERE cp.assignee_id=? AND cp.status IN ('planned','delayed') ORDER BY cp.plan_time LIMIT 50`, [staffId]);
  const rehabs = role === "rehab" ? await query<any>(
    `SELECT rs.*, res.name AS mother, r.room_no, r.id AS room_id FROM rehab_schedules rs JOIN residents res ON res.id=rs.resident_id JOIN rooms r ON r.id=res.room_id
     WHERE rs.rehab_staff_id=? AND rs.status IN ('scheduled','delayed') ORDER BY rs.start_time LIMIT 30`, [staffId]) : [];
  const schedule = await query<any>(
    `SELECT ss.*, r.room_no FROM staff_schedules ss LEFT JOIN rooms r ON r.id=ss.room_id
     WHERE ss.staff_id=? AND ss.work_date >= CURDATE() ORDER BY ss.work_date LIMIT 14`, [staffId]);
  return { plans, rehabs, schedule };
}

export async function getFinanceOverview() {
  const unpaid = await query<any>(
    `SELECT f.*, res.name AS mother, r.room_no FROM fees f JOIN residents res ON res.id=f.resident_id JOIN rooms r ON r.id=res.room_id
     WHERE f.status='unpaid' ORDER BY f.occur_date`);
  const recent = await query<any>(
    `SELECT f.*, res.name AS mother, r.room_no FROM fees f JOIN residents res ON res.id=f.resident_id JOIN rooms r ON r.id=res.room_id
     ORDER BY f.created_at DESC LIMIT 40`);
  const discharges = await query<any>(
    `SELECT d.*, res.name AS mother, r.room_no FROM discharges d JOIN residents res ON res.id=d.resident_id JOIN rooms r ON r.id=res.room_id ORDER BY d.checkout_date DESC`);
  const sum = await queryOne<any>(
    `SELECT COALESCE(SUM(CASE WHEN status='unpaid' THEN amount END),0) AS unpaid,
            COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS paid,
            COALESCE(SUM(CASE WHEN status='refunded' THEN -amount END),0) AS refunded FROM fees`);
  return { unpaid, recent, discharges, sum };
}

export async function getDischargeBoard() {
  const discharged = await query<any>(
    `SELECT res.id AS resident_id, res.name AS mother, res.baby_name, r.room_no, d.checkout_date, d.total_amount, d.paid_amount, d.refund_amount, d.followup_advice
     FROM discharges d JOIN residents res ON res.id=d.resident_id JOIN rooms r ON r.id=res.room_id ORDER BY d.checkout_date DESC`);
  const followups = await query<any>(
    `SELECT f.*, res.name AS mother, res.baby_name, s.name AS staff_name FROM followups f
     JOIN residents res ON res.id=f.resident_id LEFT JOIN staff s ON s.id=f.staff_id ORDER BY f.plan_date`);
  const referrals = await query<any>(
    `SELECT rf.*, res.name AS mother FROM referrals rf JOIN residents res ON res.id=rf.resident_id ORDER BY rf.created_at DESC`);
  return { discharged, followups, referrals };
}

export async function getFamilyPortal(familyId: number) {
  const fam = await queryOne<any>(`SELECT * FROM family_users WHERE id=?`, [familyId]);
  if (!fam || !fam.room_id) return { fam, resident: null } as any;
  const resident = await queryOne<any>(
    `SELECT res.*, r.room_no, p.name AS package_name FROM residents res JOIN rooms r ON r.id=res.room_id LEFT JOIN packages p ON p.id=r.package_id
     WHERE res.room_id=? ORDER BY res.id DESC LIMIT 1`, [fam.room_id]);
  if (!resident) return { fam, resident: null } as any;
  const full = fam.visit_level === "full";
  const [records, observations, visits, fees, messages, plans] = await Promise.all([
    query<any>(`SELECT cr.category, cr.content, cr.recorded_at, s.name AS recorder FROM care_records cr JOIN staff s ON s.id=cr.recorder_id
                WHERE cr.resident_id=? AND cr.visible_family=1 ORDER BY cr.recorded_at DESC LIMIT ?`, [resident.id, full ? 30 : 8]),
    query<any>(`SELECT observed_at, weight_g, jaundice, note FROM baby_observations WHERE resident_id=? ORDER BY observed_at DESC LIMIT ?`, [resident.id, full ? 10 : 4]),
    query<any>(`SELECT * FROM visits WHERE resident_id=? ORDER BY visit_date DESC, id DESC LIMIT 15`, [resident.id]),
    query<any>(`SELECT item_name, fee_type, amount, occur_date, status FROM fees WHERE resident_id=? ORDER BY occur_date DESC, id DESC LIMIT 30`, [resident.id]),
    query<any>(`SELECT m.*, CASE m.sender_type WHEN 'staff' THEN (SELECT name FROM staff WHERE id=m.sender_id) ELSE (SELECT name FROM family_users WHERE id=m.sender_id) END AS sender_name
                FROM family_messages m WHERE m.resident_id=? ORDER BY m.created_at DESC LIMIT 30`, [resident.id]),
    query<any>(`SELECT category, title, plan_time, status FROM care_plans WHERE resident_id=? AND status IN ('planned','delayed') ORDER BY plan_time LIMIT 12`, [resident.id]),
  ]);
  const feeSum = await queryOne<any>(
    `SELECT COALESCE(SUM(CASE WHEN status='unpaid' THEN amount END),0) AS unpaid, COALESCE(SUM(amount),0) AS total FROM fees WHERE resident_id=?`, [resident.id]);
  return { fam, resident, records, observations, visits, fees, messages, plans, feeSum, full };
}

export async function getScheduleBoard() {
  const staff = await query<any>(`SELECT id, name, role, rating, feedback_cnt FROM staff WHERE active=1 ORDER BY FIELD(role,'director','head_nurse','nurse','nanny','rehab','pediatrician','dietitian','front_desk','finance','admin'), id`);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push("");
  const rows = await query<any>(
    `SELECT ss.*, s.name AS staff_name, s.role, r.room_no FROM staff_schedules ss
     JOIN staff s ON s.id=ss.staff_id LEFT JOIN rooms r ON r.id=ss.room_id
     WHERE ss.work_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 6 DAY) ORDER BY ss.work_date, s.id`);
  const feedbacks = await query<any>(
    `SELECT fb.*, s.name AS staff_name, res.name AS mother FROM feedbacks fb
     LEFT JOIN staff s ON s.id=fb.target_staff_id JOIN residents res ON res.id=fb.resident_id ORDER BY fb.created_at DESC LIMIT 20`);
  return { staff, rows, feedbacks };
}
