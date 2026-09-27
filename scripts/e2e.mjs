// 端到端冒烟测试：登录各角色访问页面 + 关键写操作 + 自动协同流转
const BASE = "http://127.0.0.1:3000";
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ✓", msg); }
  else { fail++; failures.push(msg); console.log("  ✗", msg); }
}

async function login(username, password, kind = "staff") {
  const html = await fetch(`${BASE}/login`).then(r => r.text());
  const aid = html.match(/name="(\$ACTION_ID_[a-f0-9]+)"/)?.[1];
  if (!aid) throw new Error("no login action id");
  const fd = new FormData();
  fd.append(aid, "");
  fd.append("username", username);
  fd.append("password", password);
  fd.append("kind", kind);
  const res = await fetch(`${BASE}/login`, { method: "POST", body: fd, redirect: "manual" });
  const cookie = res.headers.getSetCookie()[0]?.split(";")[0] || "";
  if (!cookie) throw new Error(`login ${username}: no cookie (${res.status})`);
  return cookie;
}

async function get(cookie, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, loc: res.headers.get("location"), html: await res.text() };
}

// 提取包含某个字段名的表单的 ACTION_ID（同页多表单时按字段定位）
function findActionId(html, fieldName) {
  const forms = html.split(/<form /).slice(1).map(s => "<form " + s.split("</form>")[0]);
  for (const f of forms) {
    if (f.includes(`name="${fieldName}"`)) {
      const m = f.match(/name="(\$ACTION_ID_[a-f0-9]+)"/);
      if (m) return m[1];
    }
  }
  return null;
}

async function submit(cookie, path, fields, locateField) {
  const page = await get(cookie, path);
  const aid = findActionId(page.html, locateField);
  if (!aid) throw new Error(`action for ${locateField} not found on ${path}`);
  const fd = new FormData();
  fd.append(aid, "");
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    fd.append(k, String(v));
  }
  const res = await fetch(`${path}`.startsWith("http") ? path : BASE + path, {
    method: "POST", headers: { cookie }, body: fd, redirect: "manual",
  });
  return res;
}

const mysql = await import("mysql2/promise");
const db = await mysql.createConnection({ host: "127.0.0.1", user: "yuezi", password: "yuezi123", database: "yuezi_center" });
async function q(sql, p = []) { const [r] = await db.query(sql, p); return r; }

console.log("== 1. 角色登录与页面可访问 ==");
const roles = [
  ["admin", "admin123", ["/rooms", "/incidents", "/schedule", "/finance", "/discharge", "/tasks"]],
  ["director", "dir123", ["/rooms", "/rooms/1", "/schedule"]],
  ["headnurse", "hn123", ["/rooms/1", "/incidents/9", "/schedule"]],
  ["nurse", "nurse123", ["/tasks", "/rooms/1"]],
  ["ped", "ped123", ["/rooms/1"]],
  ["diet", "diet123", ["/rooms/1"]],
  ["rehab", "rehab123", ["/tasks"]],
  ["nanny", "nanny123", ["/tasks"]],
  ["front", "front123", ["/rooms/2"]],
  ["finance", "fin123", ["/finance"]],
];
for (const [u, p, paths] of roles) {
  const cookie = await login(u, p);
  for (const path of paths) {
    const r = await get(cookie, path);
    ok(r.status === 200, `${u} GET ${path} = 200`);
  }
}
const famCookie = await login("family1", "fam123", "family");
const fr = await get(famCookie, "/family");
ok(fr.status === 200 && fr.html.includes("护理摘要"), "family1 家属中心可见护理摘要");
const fam2 = await login("family2", "fam123", "family");
ok((await get(fam2, "/family")).html.includes("A302"), "family2 关联 A302");

console.log("== 2. 错误密码被拒 ==");
try {
  await login("nurse", "wrong");
  ok(false, "错误密码应拒绝");
} catch { ok(true, "错误密码登录失败（无会话）"); }

console.log("== 3. 黄疸 high 观察自动生成异常并流转儿科 ==");
const nurse = await login("nurse", "nurse123");
const before = (await q("SELECT COUNT(*) c FROM incidents WHERE type='jaundice' AND resident_id=2"))[0].c;
let res = await submit(nurse, "/rooms/2", {
  resident_id: 2, room_id: 2, weight_g: 3460, jaundice: "high", bilirubin: 17.2, note: "E2E 黄疸升高",
}, "jaundice");
ok([200, 303].includes(res.status), `提交宝宝观察 HTTP ${res.status}`);
const after = (await q("SELECT COUNT(*) c FROM incidents WHERE type='jaundice' AND resident_id=2 AND status IN('open','processing')"))[0].c;
ok(after === before + 1, "自动为 A302 创建黄疸异常单");
const act = await q("SELECT lead_role FROM incidents WHERE type='jaundice' AND resident_id=2 ORDER BY id DESC LIMIT 1");
ok(act[0].lead_role === "pediatrician", "黄疸异常牵头角色=儿科医生");

console.log("== 4. 儿科医生填写巡诊记录 ==");
const ped = await login("ped", "ped123");
res = await submit(ped, "/rooms/2", {
  resident_id: 2, room_id: 2, diagnosis: "E2E 高胆红素血症", advice: "蓝光治疗 12 小时", next_round: "2026-09-27",
}, "diagnosis");
ok([200, 303].includes(res.status), "儿科提交巡诊记录");
const round = await q("SELECT COUNT(*) c FROM doctor_rounds WHERE resident_id=2 AND diagnosis LIKE 'E2E%'");
ok(round[0].c === 1, "巡诊记录落库");

console.log("== 5. 异常协同：护士长在质疑记录单上处置/升级 ==");
const hn = await login("headnurse", "hn123");
res = await submit(hn, "/incidents/7", { incident_id: 7, action: "handle", content: "E2E 已调取托管日志核对" }, "action");
ok([200, 303].includes(res.status), "护士长接手 record_dispute");
const i7 = await q("SELECT status FROM incidents WHERE id=7");
ok(i7[0].status === "processing", "异常 7 状态→处理中");
const a = await q("SELECT COUNT(*) c FROM incident_actions WHERE incident_id=7 AND content LIKE 'E2E%'");
ok(a[0].c >= 1, "协同动作落库");

console.log("== 6. 家属临时探访 → 异常流转前台 ==");
res = await submit(famCookie, "/family", {
  visitor_name: "张磊", visitor_phone: "13800000001", visit_date: "2026-09-28", visit_time: "19:00",
  visitors_cnt: 2, kind: "temporary", temp_reason: "E2E 外地亲属临时到访",
}, "visit_date");
ok([200, 303].includes(res.status), "家属提交临时探访");
const tv = await q("SELECT id,status FROM visits WHERE resident_id=1 AND kind='temporary' ORDER BY id DESC LIMIT 1");
ok(tv[0].status === "requested", "临时探访为待审批");
const ti = await q("SELECT id,lead_role FROM incidents WHERE type='temp_visit' ORDER BY id DESC LIMIT 1");
ok(ti[0].lead_role === "front_desk", "临时探访异常牵头=前台");
// 前台批准
const front = await login("front", "front123");
const roomPage = await get(front, "/rooms/1");
const approveAid = (() => {
  const forms = roomPage.html.split(/<form /).slice(1).map(s => "<form " + s.split("</form>")[0]);
  for (const f of forms) {
    if (f.includes('name="decision"') && f.includes('value="approve"')) {
      const m = f.match(/name="(\$ACTION_ID_[a-f0-9]+)"/); if (m) return m[1];
    }
  }
  return null;
})();
ok(!!approveAid, "找到批准探访表单");
if (approveAid) {
  const fd = new FormData(); fd.append(approveAid, "");
  fd.append("visit_id", tv[0].id); fd.append("room_id", 1); fd.append("decision", "approve");
  const r2 = await fetch(`${BASE}/rooms/1`, { method: "POST", headers: { cookie: front }, body: fd, redirect: "manual" });
  ok([200, 303].includes(r2.status), "前台批准临时探访");
  const v2 = await q("SELECT status FROM visits WHERE id=?", [tv[0].id]);
  ok(v2[0].status === "approved", "探访状态→已批准");
}

console.log("== 7. 家属反馈 → 护理师评分变化 + 排班处置 ==");
const r5 = await q("SELECT rating FROM staff WHERE id=5");
await submit(famCookie, "/family", {
  score: 2, target_staff_id: 5, tags: "投诉;E2E", content: "E2E 低分反馈测试",
}, "score");
const r5b = await q("SELECT rating, feedback_cnt FROM staff WHERE id=5");
ok(Number(r5b[0].rating) < Number(r5[0].rating), `护理师评分下降 ${r5[0].rating} → ${r5b[0].rating}`);
const fb = await q("SELECT id FROM feedbacks WHERE content LIKE 'E2E 低分%' ORDER BY id DESC LIMIT 1");
ok(fb.length === 1, "反馈落库");
// 主管登记排班影响
const director = await login("director", "dir123");
await submit(director, "/schedule", { feedback_id: fb[0].id, schedule_impact: "E2E 减少夜间独立派单" }, "schedule_impact");
const fb2 = await q("SELECT schedule_impact FROM feedbacks WHERE id=?", [fb[0].id]);
ok(fb2[0].schedule_impact === "E2E 减少夜间独立派单", "排班影响已登记");

console.log("== 8. 月嫂请假 → 异常 + 排班 ==");
const nanny = await login("nanny", "nanny123");
await submit(nanny, "/tasks", { staff_id: 9, work_date: "2026-09-30", reason: "E2E 家中急事" }, "work_date");
const lv = await q("SELECT shift FROM staff_schedules WHERE staff_id=9 AND work_date='2026-09-30'");
ok(lv[0]?.shift === "leave", "9/30 排班=请假");
const ni = await q("SELECT COUNT(*) c FROM incidents WHERE type='nanny_leave' AND description LIKE '%E2E%'");
ok(ni[0].c === 1, "自动生成月嫂请假异常");

console.log("== 9. 产康延期 → 异常 + 改期 ==");
const rehab = await login("rehab", "rehab123");
await submit(rehab, "/rooms/1", {
  rehab_id: 1, resident_id: 1, room_id: 1, reason: "E2E 设备维护", rescheduled_to: "2026-09-27T10:00",
}, "reason");
const rs1 = await q("SELECT status, rescheduled_to FROM rehab_schedules WHERE id=1");
ok(rs1[0].status === "delayed", "产康状态=延期");
const rd = await q("SELECT COUNT(*) c FROM incidents WHERE type='rehab_delay' AND description LIKE '%E2E%'");
ok(rd[0].c === 1, "自动生成产康延期异常");

console.log("== 10. 财务开单与收款 ==");
const fin = await login("finance", "fin123");
const unpaid0 = (await q("SELECT COUNT(*) c FROM fees WHERE resident_id=1 AND status='unpaid'"))[0].c;
await submit(fin, "/finance", { resident_id: 1, item_name: "E2E 加项", fee_type: "other", amount: 300, occur_date: "2026-09-26" }, "item_name");
const fee = await q("SELECT id, status FROM fees WHERE item_name='E2E 加项' ORDER BY id DESC LIMIT 1");
ok(fee[0].status === "unpaid", "新账单待收");
// 房间页收款
const fid = fee[0].id;
const fd = new FormData();
const roomHtml = (await get(fin, "/rooms/1")).html;
const settleAid = (() => {
  for (const f0 of roomHtml.split(/<form /).slice(1).map(s => "<form " + s.split("</form>")[0])) {
    if (f0.includes(`name="fee_id" value="${fid}"`)) return f0.match(/name="(\$ACTION_ID_[a-f0-9]+)"/)?.[1];
  }
  return null;
})();
ok(!!settleAid, "定位到 E2E 账单收款表单");
if (settleAid) {
  fd.append(settleAid, ""); fd.append("fee_id", fid); fd.append("room_id", 1);
  await fetch(`${BASE}/rooms/1`, { method: "POST", headers: { cookie: fin }, body: fd, redirect: "manual" });
  const fee2 = await q("SELECT status FROM fees WHERE id=?", [fid]);
  ok(fee2[0].status === "paid", "账单状态→已收");
}

console.log("== 11. 家属端费用随开单更新 ==");
const famHtml = (await get(famCookie, "/family")).html;
ok(famHtml.includes("E2E 加项"), "家属端可见新费用明细");

console.log("== 12. 提前退所：归档 + 争议同步护士长 + 随访计划 ==");
// 用在住产妇 2 走提前退所
const preFollow = (await q("SELECT COUNT(*) c FROM followups WHERE resident_id=2"))[0].c;
await submit(hn, "/rooms/2", {
  resident_id: 2, room_id: 2, checkout_date: "2026-09-27", early: "1", followup_advice: "E2E 42 天复查",
}, "checkout_date");
const res2 = await q("SELECT status, actual_checkout FROM residents WHERE id=2");
ok(res2[0].status === "discharged" && new Date(res2[0].actual_checkout).toISOString().startsWith("2026-09-27"), `产妇 2 已出所（actual_checkout=${res2[0].actual_checkout}）`);
const room2 = await q("SELECT status FROM rooms WHERE id=2");
ok(room2[0].status === "cleanup", "房间 A302 转清扫");
const ec = await q("SELECT dispute_to_headnurse, status FROM incidents WHERE type='early_checkout' ORDER BY id DESC LIMIT 1");
ok(ec[0]?.dispute_to_headnurse === 1, "提前退所争议同步护士长");
const postFollow = (await q("SELECT COUNT(*) c FROM followups WHERE resident_id=2"))[0].c;
ok(postFollow === preFollow + 2, "自动建立 14/42 天两条随访");
const dis = await q("SELECT * FROM discharges WHERE resident_id=2");
ok(dis.length === 1 && dis[0].followup_advice.includes("E2E"), "出所归档含回访建议");

console.log("== 13. 随访完成（护理记录进入出所后随访） ==");
const fu = await q("SELECT id FROM followups WHERE resident_id=2 AND status='planned' ORDER BY plan_date LIMIT 1");
await submit(nurse, "/discharge", { followup_id: fu[0].id, mother_note: "E2E 恢复良好", baby_note: "E2E 黄疸消退" }, "mother_note");
const fu2 = await q("SELECT status, mother_note, baby_note FROM followups WHERE id=?", [fu[0].id]);
ok(fu2[0].status === "done" && fu2[0].baby_note.includes("E2E"), "随访完成并记录母婴情况");

console.log("== 14. 转介绍线索登记与更新 ==");
await submit(front, "/discharge", { resident_id: 2, kind: "referral", contact_name: "E2E 刘女士", contact_phone: "13711112222", note: "E2E 线索" }, "contact_name");
const rf = await q("SELECT id, status FROM referrals WHERE contact_name LIKE 'E2E%' ORDER BY id DESC LIMIT 1");
ok(rf[0].status === "lead", "新线索=lead");
await submit(front, "/discharge", { referral_id: rf[0].id, status: "won" }, "referral_id");
const rf2 = await q("SELECT status FROM referrals WHERE id=?", [rf[0].id]);
ok(rf2[0].status === "won", "线索更新为成交");

console.log("== 15. 家属质疑护理记录（家属端直达护士长） ==");
await submit(famCookie, "/family", { title: "E2E 质疑", description: "E2E 记录与实际不符" }, "description");
const disp = await q("SELECT lead_role, severity, raised_by_type FROM incidents WHERE type='record_dispute' ORDER BY id DESC LIMIT 1");
ok(disp[0].lead_role === "head_nurse" && disp[0].raised_by_type === "family", "家属质疑单直达护士长");

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail) { console.log("失败项：", failures); process.exit(1); }
await db.end();
