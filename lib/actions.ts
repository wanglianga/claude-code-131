"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exec, query, queryOne } from "./db";
import { createSession, destroySession, getPrincipal, requireStaff, requireFamily, ROLE_HOME } from "./auth";

function s(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

// ---------- 登录 / 登出 ----------
export async function loginAction(formData: FormData) {
  const username = s(formData.get("username"));
  const password = s(formData.get("password"));
  const kind = s(formData.get("kind")) || "staff";
  if (!username || !password) redirect("/login?err=1");
  if (kind === "family") {
    const u = await queryOne<any>("SELECT id FROM family_users WHERE username=? AND password=?", [username, password]);
    if (!u) redirect("/login?err=1");
    await createSession("family", u.id);
    redirect("/family");
  }
  const u = await queryOne<any>("SELECT id, role FROM staff WHERE username=? AND password=? AND active=1", [username, password]);
  if (!u) redirect("/login?err=1");
  await createSession("staff", u.id);
  redirect(ROLE_HOME[u.role as keyof typeof ROLE_HOME] || "/rooms");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// ---------- 护理计划 / 记录 ----------
export async function addCarePlan(formData: FormData) {
  const me = await requireStaff(["director", "head_nurse", "admin"]);
  const residentId = Number(formData.get("resident_id"));
  await exec(
    `INSERT INTO care_plans (resident_id, category, title, plan_time, assignee_id, frequency, note, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [residentId, s(formData.get("category")), s(formData.get("title")), s(formData.get("plan_time")) || null,
     Number(formData.get("assignee_id")) || null, s(formData.get("frequency")), s(formData.get("note")), me.id]
  );
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

export async function updatePlanStatus(formData: FormData) {
  await requireStaff();
  const id = Number(formData.get("plan_id"));
  const status = s(formData.get("status"));
  await exec("UPDATE care_plans SET status=? WHERE id=?", [status, id]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
  revalidatePath("/tasks");
}

export async function addCareRecord(formData: FormData) {
  const me = await requireStaff();
  const residentId = Number(formData.get("resident_id"));
  await exec(
    `INSERT INTO care_records (plan_id, resident_id, category, content, recorder_id, visible_family) VALUES (?,?,?,?,?,?)`,
    [Number(formData.get("plan_id")) || null, residentId, s(formData.get("category")), s(formData.get("content")),
     me.id, formData.get("visible_family") ? 1 : 0]
  );
  revalidatePath(`/rooms/${formData.get("room_id")}`);
  revalidatePath("/family");
}

// ---------- 宝宝观察（黄疸升高自动生成异常） ----------
export async function addBabyObservation(formData: FormData) {
  const me = await requireStaff();
  const residentId = Number(formData.get("resident_id"));
  const roomId = Number(formData.get("room_id"));
  const jaundice = s(formData.get("jaundice"));
  await exec(
    `INSERT INTO baby_observations (resident_id, weight_g, jaundice, bilirubin, note, recorder_id) VALUES (?,?,?,?,?,?)`,
    [residentId, Number(formData.get("weight_g")) || null, jaundice,
     formData.get("bilirubin") ? Number(formData.get("bilirubin")) : null, s(formData.get("note")), me.id]
  );
  if (jaundice === "high") {
    const exists = await queryOne<any>(
      "SELECT id FROM incidents WHERE resident_id=? AND type='jaundice' AND status IN ('open','processing')", [residentId]);
    if (!exists) {
      const r = await exec(
        `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id)
         VALUES (?,?, 'jaundice', ?, ?, 'high', 'pediatrician', 'staff', ?)`,
        [residentId, roomId, "宝宝黄疸升高，需儿科评估",
         `经皮胆红素 ${s(formData.get("bilirubin")) || "—"} mg/dL，黄疸等级 high，已自动上报儿科医生与护士长。`, me.id]);
      await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,'create',?)`,
        [r.insertId, me.id, me.role, "黄疸监测触发自动上报，请儿科医生评估是否光疗。"]);
    }
  }
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/incidents");
}

// ---------- 医生巡诊 ----------
export async function addDoctorRound(formData: FormData) {
  const me = await requireStaff(["pediatrician", "admin"]);
  await exec(
    `INSERT INTO doctor_rounds (resident_id, doctor_id, diagnosis, advice, next_round) VALUES (?,?,?,?,?)`,
    [Number(formData.get("resident_id")), me.id, s(formData.get("diagnosis")), s(formData.get("advice")), s(formData.get("next_round")) || null]
  );
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

// ---------- 月子餐 ----------
export async function addMeal(formData: FormData) {
  const me = await requireStaff(["dietitian", "admin", "head_nurse"]);
  await exec(
    `INSERT INTO meals (resident_id, meal_date, slot, menu, dietitian_id, note) VALUES (?,?,?,?,?,?)`,
    [Number(formData.get("resident_id")), s(formData.get("meal_date")), s(formData.get("slot")), s(formData.get("menu")), me.id, s(formData.get("note"))]
  );
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

export async function markMealIssue(formData: FormData) {
  const me = await requireStaff();
  const mealId = Number(formData.get("meal_id"));
  const residentId = Number(formData.get("resident_id"));
  const roomId = Number(formData.get("room_id"));
  await exec("UPDATE meals SET status='issue', note=? WHERE id=?", [s(formData.get("note")), mealId]);
  const r = await exec(
    `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id)
     VALUES (?,?, 'meal_violation', '月子餐疑似违反忌口', ?, 'high', 'dietitian', 'staff', ?)`,
    [residentId, roomId, s(formData.get("note")) || "餐品与产妇忌口冲突，需营养师与厨房核查。", me.id]);
  await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,'create',?)`,
    [r.insertId, me.id, me.role, "餐食忌口异常上报，已停餐待核查。"]);
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/incidents");
}

export async function serveMeal(formData: FormData) {
  await requireStaff();
  await exec("UPDATE meals SET status='served' WHERE id=?", [Number(formData.get("meal_id"))]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

// ---------- 产康 ----------
export async function delayRehab(formData: FormData) {
  const me = await requireStaff(["rehab", "director", "admin"]);
  const id = Number(formData.get("rehab_id"));
  const residentId = Number(formData.get("resident_id"));
  const roomId = Number(formData.get("room_id"));
  const to = s(formData.get("rescheduled_to"));
  await exec("UPDATE rehab_schedules SET status='delayed', delay_reason=?, rescheduled_to=? WHERE id=?",
    [s(formData.get("reason")), to || null, id]);
  const r = await exec(
    `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id)
     VALUES (?,?, 'rehab_delay', '产康项目延期', ?, 'low', 'front_desk', 'staff', ?)`,
    [residentId, roomId, `产康课程延期至 ${to || "待定"}：${s(formData.get("reason"))}`, me.id]);
  await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,'create',?)`,
    [r.insertId, me.id, me.role, "产康延期，前台需通知家属并更新排班。"]);
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/incidents");
}

export async function doneRehab(formData: FormData) {
  await requireStaff(["rehab", "director", "admin"]);
  await exec("UPDATE rehab_schedules SET status='done', end_time=NOW() WHERE id=?", [Number(formData.get("rehab_id"))]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
  revalidatePath("/tasks");
}

// ---------- 排班 / 月嫂请假 ----------
export async function setSchedule(formData: FormData) {
  await requireStaff(["director", "head_nurse", "admin"]);
  await exec(
    `INSERT INTO staff_schedules (staff_id, work_date, shift, room_id, remark) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE shift=VALUES(shift), room_id=VALUES(room_id), remark=VALUES(remark)`,
    [Number(formData.get("staff_id")), s(formData.get("work_date")), s(formData.get("shift")),
     Number(formData.get("room_id")) || null, s(formData.get("remark"))]
  );
  revalidatePath("/schedule");
}

export async function nannyLeave(formData: FormData) {
  const me = await requireStaff(["nanny", "director", "head_nurse", "admin"]);
  const staffId = Number(formData.get("staff_id")) || me.id;
  const date = s(formData.get("work_date"));
  await exec(
    `INSERT INTO staff_schedules (staff_id, work_date, shift, remark) VALUES (?,?, 'leave', ?)
     ON DUPLICATE KEY UPDATE shift='leave', remark=VALUES(remark)`,
    [staffId, date, s(formData.get("reason"))]
  );
  const resident = await queryOne<any>("SELECT resident_id, room_id FROM (SELECT res.id AS resident_id, res.room_id FROM residents res JOIN staff_schedules ss ON ss.room_id=res.room_id WHERE ss.staff_id=? AND res.status='inhouse' LIMIT 1) t", [staffId]);
  if (resident) {
    const r = await exec(
      `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id)
       VALUES (?,?, 'nanny_leave', '月嫂请假，夜间照护需调班', ?, 'medium', 'director', 'staff', ?)`,
      [resident.resident_id, resident.room_id, `月嫂 ${date} 请假：${s(formData.get("reason"))}，请护理主管安排顶班。`, me.id]);
    await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,'create',?)`,
      [r.insertId, me.id, me.role, "请假登记，触发调班流程。"]);
  }
  revalidatePath("/schedule");
  revalidatePath("/incidents");
}

// ---------- 宝宝托管 ----------
export async function addNurseryLog(formData: FormData) {
  const me = await requireStaff();
  await exec(
    `INSERT INTO nursery_logs (resident_id, start_time, nanny_id, feeding_ml, diaper, sleep_note, status) VALUES (?,NOW(),?,?,?,?,'ongoing')`,
    [Number(formData.get("resident_id")), me.id, Number(formData.get("feeding_ml")) || null,
     Number(formData.get("diaper")) || null, s(formData.get("sleep_note"))]
  );
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

export async function finishNurseryLog(formData: FormData) {
  await requireStaff();
  await exec("UPDATE nursery_logs SET status='finished', end_time=NOW() WHERE id=?", [Number(formData.get("log_id"))]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

// ---------- 探访 ----------
export async function requestVisit(formData: FormData) {
  const me = await requireFamily();
  const resident = await queryOne<any>("SELECT id FROM residents WHERE room_id=? AND status='inhouse'", [me.room_id]);
  if (!resident) redirect("/family?err=noroom");
  await exec(
    `INSERT INTO visits (resident_id, family_id, visitor_name, visitor_phone, visit_date, visit_time, visitors_cnt, kind, temp_reason)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [resident.id, me.id, s(formData.get("visitor_name")) || me.name, s(formData.get("visitor_phone")),
     s(formData.get("visit_date")), s(formData.get("visit_time")), Number(formData.get("visitors_cnt")) || 1,
     s(formData.get("kind")) === "temporary" ? "temporary" : "scheduled", s(formData.get("temp_reason")) || null]
  );
  if (s(formData.get("kind")) === "temporary") {
    const room = await queryOne<any>("SELECT room_id FROM residents WHERE id=?", [resident.id]);
    const r = await exec(
      `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id)
       VALUES (?,?, 'temp_visit', '家属临时增加探访', ?, 'medium', 'front_desk', 'family', ?)`,
      [resident.id, room!.room_id, `${me.name}（${me.relation}）申请临时探访：${s(formData.get("temp_reason")) || "临时事由"}，需前台与护士长审批并安排消毒。`, me.id]);
    await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?, (SELECT id FROM staff WHERE role='front_desk' LIMIT 1), 'front_desk', 'create', ?)`,
      [r.insertId, "家属端发起临时探访申请，自动流转前台。"]);
  }
  revalidatePath("/family");
  revalidatePath("/incidents");
}

export async function reviewVisit(formData: FormData) {
  const me = await requireStaff(["front_desk", "head_nurse", "admin", "director"]);
  const id = Number(formData.get("visit_id"));
  const decision = s(formData.get("decision")) === "approve" ? "approved" : "rejected";
  await exec("UPDATE visits SET status=?, approve_by=? WHERE id=?", [decision, me.id, id]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

export async function checkinVisit(formData: FormData) {
  await requireStaff(["front_desk", "head_nurse", "admin"]);
  await exec("UPDATE visits SET status='checked_in' WHERE id=?", [Number(formData.get("visit_id"))]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

export async function finishVisit(formData: FormData) {
  await requireStaff(["front_desk", "head_nurse", "admin"]);
  await exec("UPDATE visits SET status='finished' WHERE id=?", [Number(formData.get("visit_id"))]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

export async function addDisinfection(formData: FormData) {
  const me = await requireStaff(["front_desk", "nurse", "head_nurse", "admin"]);
  await exec(
    `INSERT INTO visit_disinfections (visit_id, method, operator_id, result) VALUES (?,?,?,?)`,
    [Number(formData.get("visit_id")), s(formData.get("method")), me.id, s(formData.get("result")) || "pass"]
  );
  revalidatePath(`/rooms/${formData.get("room_id")}`);
}

// ---------- 异常协同 ----------
export async function createIncident(formData: FormData) {
  const p = await getPrincipal();
  if (!p) redirect("/login");
  const residentId = Number(formData.get("resident_id"));
  const roomId = Number(formData.get("room_id"));
  const type = s(formData.get("type"));
  const leadMap: Record<string, string> = {
    jaundice: "pediatrician", breast_block: "head_nurse", temp_visit: "front_desk",
    nanny_leave: "director", meal_violation: "dietitian", rehab_delay: "front_desk",
    package_upgrade: "finance", room_upgrade: "finance", early_checkout: "finance",
    record_dispute: "head_nurse", checkout_dispute: "head_nurse", other: "head_nurse",
  };
  const dispute = type === "checkout_dispute" || type === "early_checkout" ? 1 : 0;
  const r = await exec(
    `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id, dispute_to_headnurse)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [residentId, roomId, type, s(formData.get("title")), s(formData.get("description")),
     s(formData.get("severity")) || "medium", leadMap[type] || "head_nurse",
     p.kind, p.id, dispute]
  );
  if (p.kind === "staff") {
    await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,'create',?)`,
      [r.insertId, p.id, p.role, s(formData.get("description")) || s(formData.get("title"))]);
  }
  revalidatePath("/incidents");
  revalidatePath(`/rooms/${roomId}`);
  redirect(`/incidents/${r.insertId}`);
}

export async function addIncidentAction(formData: FormData) {
  const me = await requireStaff();
  const id = Number(formData.get("incident_id"));
  const action = s(formData.get("action")) || "comment";
  await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,?,?)`,
    [id, me.id, me.role, action, s(formData.get("content"))]);
  if (action === "resolve") {
    await exec("UPDATE incidents SET status='resolved', resolved_at=NOW(), resolution=? WHERE id=?", [s(formData.get("content")), id]);
  } else if (action === "escalate") {
    await exec("UPDATE incidents SET status='escalated' WHERE id=?", [id]);
  } else if (action === "handle" || action === "assign") {
    await exec("UPDATE incidents SET status='processing' WHERE id=? AND status='open'", [id]);
  } else if (action === "close") {
    await exec("UPDATE incidents SET status='closed' WHERE id=?", [id]);
  }
  revalidatePath(`/incidents/${id}`);
  revalidatePath("/incidents");
}

// ---------- 费用 ----------
export async function addFee(formData: FormData) {
  const me = await requireStaff(["finance", "admin", "front_desk"]);
  await exec(
    `INSERT INTO fees (resident_id, item_name, fee_type, amount, occur_date, status, incident_id, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [Number(formData.get("resident_id")), s(formData.get("item_name")), s(formData.get("fee_type")),
     Number(formData.get("amount")), s(formData.get("occur_date")) || new Date().toISOString().slice(0, 10),
     Number(formData.get("amount")) < 0 ? "refunded" : "unpaid",
     Number(formData.get("incident_id")) || null, me.id]
  );
  revalidatePath("/finance");
  revalidatePath(`/rooms/${formData.get("room_id")}`);
  revalidatePath("/family");
}

export async function settleFee(formData: FormData) {
  await requireStaff(["finance", "admin"]);
  await exec("UPDATE fees SET status='paid' WHERE id=?", [Number(formData.get("fee_id"))]);
  revalidatePath("/finance");
  const roomId = s(formData.get("room_id"));
  if (roomId) revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/family");
}

// ---------- 家属沟通 ----------
export async function sendMessage(formData: FormData) {
  const p = await getPrincipal();
  if (!p) redirect("/login");
  let residentId = Number(formData.get("resident_id"));
  if (p.kind === "family") {
    const res = await queryOne<any>("SELECT id FROM residents WHERE room_id=? AND status='inhouse'", [p.room_id]);
    if (!res) return;
    residentId = res.id;
  }
  await exec(`INSERT INTO family_messages (resident_id, sender_type, sender_id, content) VALUES (?,?,?,?)`,
    [residentId, p.kind, p.id, s(formData.get("content"))]);
  revalidatePath(`/rooms/${formData.get("room_id")}`);
  revalidatePath("/family");
}

// ---------- 家属反馈（影响口碑与排班） ----------
export async function submitFeedback(formData: FormData) {
  const me = await requireFamily();
  const resident = await queryOne<any>("SELECT id FROM residents WHERE room_id=? AND status='inhouse'", [me.room_id]);
  if (!resident) redirect("/family?err=noroom");
  const staffId = Number(formData.get("target_staff_id")) || null;
  const score = Math.min(5, Math.max(1, Number(formData.get("score")) || 5));
  await exec(
    `INSERT INTO feedbacks (resident_id, family_id, target_staff_id, score, content, tags) VALUES (?,?,?,?,?,?)`,
    [resident.id, me.id, staffId, score, s(formData.get("content")), s(formData.get("tags"))]
  );
  if (staffId) {
    await exec(
      `UPDATE staff SET rating = ROUND((rating*feedback_cnt + ?)/(feedback_cnt+1), 2), feedback_cnt = feedback_cnt + 1 WHERE id=?`,
      [score, staffId]
    );
  }
  revalidatePath("/family");
  revalidatePath("/schedule");
}

export async function setFeedbackImpact(formData: FormData) {
  await requireStaff(["director", "head_nurse", "admin"]);
  await exec("UPDATE feedbacks SET schedule_impact=? WHERE id=?", [s(formData.get("schedule_impact")), Number(formData.get("feedback_id"))]);
  revalidatePath("/schedule");
}

// ---------- 退所 / 出所归档 ----------
export async function processCheckout(formData: FormData) {
  const me = await requireStaff(["head_nurse", "director", "finance", "admin"]);
  const residentId = Number(formData.get("resident_id"));
  const roomId = Number(formData.get("room_id"));
  const resident = await queryOne<any>("SELECT * FROM residents WHERE id=?", [residentId]);
  if (!resident || resident.status !== "inhouse") redirect(`/rooms/${roomId}`);
  const early = s(formData.get("early")) === "1";
  const sum = await queryOne<any>(
    `SELECT COALESCE(SUM(CASE WHEN status='unpaid' AND amount>0 THEN amount END),0) AS unpaid,
            COALESCE(SUM(CASE WHEN amount>0 THEN amount END),0) AS charges,
            COALESCE(SUM(CASE WHEN amount<0 THEN -amount END),0) AS refunds,
            COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS paid
     FROM fees WHERE resident_id=?`, [residentId]);
  const checkoutDate = s(formData.get("checkout_date")) || new Date().toISOString().slice(0, 10);
  if (early) {
    const r = await exec(
      `INSERT INTO incidents (resident_id, room_id, type, title, description, severity, lead_role, raised_by_type, raised_by_id, dispute_to_headnurse)
       VALUES (?,?, 'early_checkout', '提前退所结算', ?, 'high', 'finance', 'staff', ?, 1)`,
      [residentId, roomId, `产妇提前于 ${checkoutDate} 退所（原定 ${resident.expected_checkout}），财务核算退费/违约金，争议同步护士长。`, me.id]);
    await exec(`INSERT INTO incident_actions (incident_id, actor_id, actor_role, action, content) VALUES (?,?,?,'create','提前退所流程启动，费用与争议同步护士长。')`,
      [r.insertId, me.id, me.role]);
  }
  await exec(
    `INSERT INTO discharges (resident_id, checkout_date, total_amount, paid_amount, refund_amount, followup_advice, handled_by)
     VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE checkout_date=VALUES(checkout_date), followup_advice=VALUES(followup_advice)`,
    [residentId, checkoutDate, sum?.charges ?? 0, sum?.paid ?? 0, sum?.refunds ?? 0, s(formData.get("followup_advice")), me.id]
  );
  await exec("UPDATE residents SET status='discharged', actual_checkout=? WHERE id=?", [checkoutDate, residentId]);
  await exec("UPDATE rooms SET status='cleanup' WHERE id=?", [roomId]);
  // 出所后母婴随访计划：护理记录延续
  await exec(`INSERT INTO followups (resident_id, plan_date, staff_id) VALUES (?, DATE_ADD(?, INTERVAL 14 DAY), ?)`,
    [residentId, checkoutDate, me.id]);
  await exec(`INSERT INTO followups (resident_id, plan_date, staff_id) VALUES (?, DATE_ADD(?, INTERVAL 42 DAY), ?)`,
    [residentId, checkoutDate, me.id]);
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
  revalidatePath("/discharge");
  redirect("/discharge");
}

// ---------- 随访 / 线索 ----------
export async function doneFollowup(formData: FormData) {
  const me = await requireStaff();
  await exec("UPDATE followups SET status='done', done_at=NOW(), mother_note=?, baby_note=?, staff_id=? WHERE id=?",
    [s(formData.get("mother_note")), s(formData.get("baby_note")), me.id, Number(formData.get("followup_id"))]);
  revalidatePath("/discharge");
}

export async function addReferral(formData: FormData) {
  await requireStaff(["front_desk", "director", "admin", "head_nurse"]);
  await exec(
    `INSERT INTO referrals (resident_id, kind, contact_name, contact_phone, note) VALUES (?,?,?,?,?)`,
    [Number(formData.get("resident_id")), s(formData.get("kind")), s(formData.get("contact_name")),
     s(formData.get("contact_phone")), s(formData.get("note"))]
  );
  revalidatePath("/discharge");
}

export async function updateReferralStatus(formData: FormData) {
  await requireStaff(["front_desk", "director", "admin"]);
  await exec("UPDATE referrals SET status=? WHERE id=?", [s(formData.get("status")), Number(formData.get("referral_id"))]);
  revalidatePath("/discharge");
}
