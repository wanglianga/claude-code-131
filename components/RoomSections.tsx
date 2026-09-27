import {
  addCarePlan, updatePlanStatus, addCareRecord, addBabyObservation, addDoctorRound,
  addMeal, markMealIssue, serveMeal, delayRehab, doneRehab, addNurseryLog, finishNurseryLog,
  reviewVisit, checkinVisit, finishVisit, addDisinfection, addFee, settleFee,
  sendMessage, processCheckout, createIncident,
} from "@/lib/actions";
import {
  DELIVERY, FEEDING, JAUNDICE, PLAN_CAT, PLAN_STATUS, INCIDENT_TYPE, INCIDENT_STATUS,
  VISIT_STATUS, FEE_TYPE, FEE_STATUS, MEAL_SLOT, REHAB_STATUS,
} from "@/lib/labels";
import type { StaffUser } from "@/lib/auth";
import Link from "next/link";

const has = (me: StaffUser, roles: string[]) => roles.includes(me.role);
const money = (n: number) => `¥${Number(n).toLocaleString()}`;

/* ---------------- 入住档案 ---------------- */
export function ProfileCard({ d }: { d: any }) {
  const res = d.resident;
  return (
    <div className="card">
      <h3>入住档案 · {res.name}（宝宝：{res.baby_name}）</h3>
      <dl className="kv">
        <dt>分娩方式</dt><dd>{DELIVERY[res.delivery_type]}，入住时产后第 {res.postpartum_days} 天（当前约第 {res.days_now} 天）</dd>
        <dt>在住周期</dt><dd>{res.checkin_date} ~ 预计 {res.expected_checkout}{res.actual_checkout ? `，实际 ${res.actual_checkout} 出所` : ""}</dd>
        <dt>哺乳方式</dt><dd>{FEEDING[res.feeding]}</dd>
        <dt>过敏史</dt><dd style={{ color: res.allergy !== "无已知过敏" ? "#b03a3a" : undefined }}>{res.allergy}</dd>
        <dt>餐食禁忌</dt><dd>{res.diet_restriction}</dd>
        <dt>探访权限</dt><dd>{res.visit_policy}</dd>
        <dt>医生建议</dt><dd>{res.doctor_advice}</dd>
        <dt>家属授权</dt><dd>{d.family.map((f: any) => `${f.name}(${f.relation},${f.visit_level === "full" ? "完整" : f.visit_level === "summary" ? "摘要" : "无"})`).join("、") || "未绑定"}</dd>
        <dt>套餐赠品</dt><dd>{d.gifts.map((g: any) => `${g.name}×${g.qty}`).join("；") || "—"}</dd>
      </dl>
    </div>
  );
}

/* ---------------- 宝宝观察（黄疸） ---------------- */
export function BabySection({ d, me }: { d: any; me: StaffUser }) {
  const can = has(me, ["nurse", "head_nurse", "pediatrician", "admin", "director"]);
  const last = d.observations[0];
  return (
    <div className="card">
      <h3>宝宝体重与黄疸 <span className="cnt">最新：{last ? `${last.weight_g ?? "—"}g · ${JAUNDICE[last.jaundice]}` : "无记录"}</span></h3>
      {last?.jaundice === "high" && <div className="alert bad mb8">黄疸偏高（经皮 {last.bilirubin ?? "—"} mg/dL），已自动生成异常单流转儿科医生。</div>}
      <table className="tbl mb8">
        <thead><tr><th>时间</th><th>体重</th><th>黄疸</th><th>胆红素</th><th>备注</th><th>记录人</th></tr></thead>
        <tbody>
          {d.observations.map((o: any) => (
            <tr key={o.id}>
              <td className="mono small">{o.observed_at}</td>
              <td>{o.weight_g ? `${o.weight_g} g` : "—"}</td>
              <td><span className={o.jaundice === "high" ? "badge bad" : o.jaundice === "moderate" ? "badge warn" : o.jaundice === "mild" ? "badge info" : "badge ok"}>{JAUNDICE[o.jaundice]}</span></td>
              <td>{o.bilirubin ?? "—"}</td>
              <td className="small">{o.note}</td><td className="small">{o.recorder}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {can && (
        <form action={addBabyObservation} className="formrow">
          <input type="hidden" name="resident_id" value={d.resident.id} />
          <input type="hidden" name="room_id" value={d.room.id} />
          <label className="f"><span>体重(g)</span><input name="weight_g" type="number" placeholder="3290" /></label>
          <label className="f"><span>黄疸</span>
            <select name="jaundice" defaultValue="none">
              {Object.entries(JAUNDICE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="f"><span>胆红素 mg/dL</span><input name="bilirubin" type="number" step="0.1" placeholder="16.8" /></label>
          <label className="f" style={{ gridColumn: "1/-1" }}><span>观察备注</span><input name="note" placeholder="吃奶/精神/黄染范围" /></label>
          <button className="btn primary small">提交观察（选 high 自动上报）</button>
        </form>
      )}
    </div>
  );
}

/* ---------------- 护理计划与记录 ---------------- */
export function CareSection({ d, me, staff }: { d: any; me: StaffUser; staff: any[] }) {
  const canPlan = has(me, ["director", "head_nurse", "admin"]);
  return (
    <div className="card">
      <h3>护理计划与执行 <span className="cnt">查房 / 伤口 / 乳房 / 产康 / 月子餐 / 洗澡抚触 / 夜间照护</span></h3>
      <table className="tbl mb12">
        <thead><tr><th>类别</th><th>项目</th><th>计划时间</th><th>负责人</th><th>频次</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {d.plans.map((p: any) => (
            <tr key={p.id}>
              <td><span className="badge brand">{PLAN_CAT[p.category]}</span></td>
              <td>{p.title}<div className="small muted">{p.note}</div></td>
              <td className="mono small">{p.plan_time ?? "—"}</td>
              <td className="small">{p.assignee || "—"}</td>
              <td className="small">{p.frequency || "—"}</td>
              <td><span className="badge">{PLAN_STATUS[p.status]}</span></td>
              <td>
                {p.status !== "done" && (
                  <form action={updatePlanStatus} className="flex">
                    <input type="hidden" name="plan_id" value={p.id} />
                    <input type="hidden" name="room_id" value={d.room.id} />
                    <input type="hidden" name="status" value="done" />
                    <button className="btn small">完成</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <details className="mb12">
        <summary className="btn small">+ 护理执行记录（时间线）</summary>
        <ul className="timeline mt8">
          {d.records.map((r: any) => (
            <li key={r.id}>
              <b>{PLAN_CAT[r.category] || r.category}</b> <span className="badge">{r.visible_family ? "家属可见" : "内部"}</span>
              <div>{r.content}</div>
              <div className="t">{r.recorded_at} · {r.recorder}</div>
            </li>
          ))}
        </ul>
        <form action={addCareRecord} className="mt8">
          <input type="hidden" name="resident_id" value={d.resident.id} />
          <input type="hidden" name="room_id" value={d.room.id} />
          <div className="formrow">
            <label className="f"><span>类别</span>
              <select name="category" defaultValue="rounds">
                {Object.entries(PLAN_CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="f" style={{ alignSelf: "end" }}>
              <span><input type="checkbox" name="visible_family" defaultChecked style={{ width: "auto" }} /> 家属端可见</span>
            </label>
          </div>
          <label className="f"><span>记录内容</span><textarea name="content" required placeholder="如：切口对合良好，无红肿渗液……" /></label>
          <button className="btn primary small">写入护理记录</button>
        </form>
      </details>

      {canPlan && (
        <details>
          <summary className="btn small">+ 护理主管/护士长安排护理计划</summary>
          <form action={addCarePlan} className="mt8">
            <input type="hidden" name="resident_id" value={d.resident.id} />
            <input type="hidden" name="room_id" value={d.room.id} />
            <div className="formrow">
              <label className="f"><span>类别</span>
                <select name="category" defaultValue="rounds">
                  {Object.entries(PLAN_CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="f"><span>项目标题</span><input name="title" required placeholder="如：护士长每日查房" /></label>
              <label className="f"><span>计划时间</span><input name="plan_time" type="datetime-local" /></label>
              <label className="f"><span>负责人</span>
                <select name="assignee_id">
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="f"><span>频次</span><input name="frequency" placeholder="每日1次" /></label>
            </div>
            <label className="f"><span>备注</span><input name="note" /></label>
            <button className="btn primary small">安排计划</button>
          </form>
        </details>
      )}
    </div>
  );
}

/* ---------------- 医生巡诊 ---------------- */
export function DoctorSection({ d, me }: { d: any; me: StaffUser }) {
  const can = has(me, ["pediatrician", "admin"]);
  return (
    <div className="card">
      <h3>儿科医生巡诊</h3>
      <ul className="timeline mb8">
        {d.rounds.map((r: any) => (
          <li key={r.id}>
            <b>{r.doctor}</b> <span className="t mono">{r.round_time}</span>
            <div>诊断：{r.diagnosis}</div>
            <div className="small">医嘱：{r.advice}</div>
            {r.next_round && <div className="small muted">下次巡诊：{r.next_round}</div>}
          </li>
        ))}
      </ul>
      {can && (
        <form action={addDoctorRound}>
          <input type="hidden" name="resident_id" value={d.resident.id} />
          <input type="hidden" name="room_id" value={d.room.id} />
          <label className="f"><span>诊断</span><input name="diagnosis" required placeholder="如：新生儿高胆红素血症风险" /></label>
          <label className="f"><span>医嘱建议</span><textarea name="advice" required /></label>
          <div className="formrow">
            <label className="f"><span>建议下次巡诊</span><input name="next_round" type="date" /></label>
          </div>
          <button className="btn primary small">提交巡诊记录</button>
        </form>
      )}
    </div>
  );
}

/* ---------------- 月子餐 ---------------- */
export function MealSection({ d, me }: { d: any; me: StaffUser }) {
  const canAdd = has(me, ["dietitian", "admin", "head_nurse"]);
  return (
    <div className="card">
      <h3>月子餐与忌口 <span className="cnt">过敏忌口：{d.resident.diet_restriction}</span></h3>
      <table className="tbl mb8">
        <thead><tr><th>日期</th><th>餐次</th><th>菜单</th><th>状态</th><th>备注/异常</th><th>操作</th></tr></thead>
        <tbody>
          {d.meals.map((m: any) => (
            <tr key={m.id}>
              <td className="mono small">{m.meal_date}</td>
              <td>{MEAL_SLOT[m.slot]}</td>
              <td className="small">{m.menu}</td>
              <td><span className={m.status === "issue" ? "badge bad" : m.status === "served" ? "badge ok" : "badge info"}>{m.status === "issue" ? "忌口异常" : m.status === "served" ? "已供餐" : "待供餐"}</span></td>
              <td className="small muted">{m.note}</td>
              <td className="flex">
                {m.status === "planned" && (
                  <>
                    <form action={serveMeal}><input type="hidden" name="meal_id" value={m.id} /><input type="hidden" name="room_id" value={d.room.id} /><button className="btn small">供餐</button></form>
                    <form action={markMealIssue}>
                      <input type="hidden" name="meal_id" value={m.id} /><input type="hidden" name="resident_id" value={d.resident.id} /><input type="hidden" name="room_id" value={d.room.id} />
                      <input type="hidden" name="note" value="供餐核对发现餐品与产妇忌口冲突" />
                      <button className="btn small danger">报忌口异常</button>
                    </form>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canAdd && (
        <form action={addMeal}>
          <input type="hidden" name="resident_id" value={d.resident.id} />
          <input type="hidden" name="room_id" value={d.room.id} />
          <div className="formrow">
            <label className="f"><span>日期</span><input name="meal_date" type="date" required /></label>
            <label className="f"><span>餐次</span><select name="slot">{Object.entries(MEAL_SLOT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <label className="f"><span>菜单（须避开忌口）</span><input name="menu" required /></label>
          <button className="btn primary small">排餐</button>
        </form>
      )}
    </div>
  );
}

/* ---------------- 产康与延期 ---------------- */
export function RehabSection({ d, me }: { d: any; me: StaffUser }) {
  const can = has(me, ["rehab", "director", "admin"]);
  return (
    <div className="card">
      <h3>产康课程与排班</h3>
      <table className="tbl">
        <thead><tr><th>课程</th><th>产康师</th><th>时间</th><th>状态</th><th>延期/改期</th><th>操作</th></tr></thead>
        <tbody>
          {d.rehabs.map((r: any) => (
            <tr key={r.id}>
              <td>{r.course_name}</td><td className="small">{r.rehab_name}</td>
              <td className="mono small">{r.start_time}</td>
              <td><span className={r.status === "delayed" ? "badge warn" : r.status === "done" ? "badge ok" : "badge info"}>{REHAB_STATUS[r.status]}</span></td>
              <td className="small">{r.delay_reason ? `${r.delay_reason} → ${r.rescheduled_to ?? "待定"}` : "—"}</td>
              <td>
                {can && r.status !== "done" && (
                  <div className="flex wrap">
                    <details>
                      <summary className="btn small">延期</summary>
                      <form action={delayRehab} className="mt8">
                        <input type="hidden" name="rehab_id" value={r.id} />
                        <input type="hidden" name="resident_id" value={d.resident.id} />
                        <input type="hidden" name="room_id" value={d.room.id} />
                        <label className="f"><span>原因</span><input name="reason" required /></label>
                        <label className="f"><span>改期到</span><input name="rescheduled_to" type="datetime-local" /></label>
                        <button className="btn small danger">确认延期（通知前台）</button>
                      </form>
                    </details>
                    <form action={doneRehab}>
                      <input type="hidden" name="rehab_id" value={r.id} /><input type="hidden" name="room_id" value={d.room.id} />
                      <button className="btn small">完成</button>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 宝宝托管日志 ---------------- */
export function NurserySection({ d, me }: { d: any; me: StaffUser }) {
  return (
    <div className="card">
      <h3>宝宝托管日志</h3>
      <table className="tbl mb8">
        <thead><tr><th>开始</th><th>结束</th><th>月嫂</th><th>喂奶(ml)</th><th>尿布</th><th>睡眠备注</th><th>状态</th><th></th></tr></thead>
        <tbody>
          {d.nursery.map((n: any) => (
            <tr key={n.id}>
              <td className="mono small">{n.start_time}</td><td className="mono small">{n.end_time || "进行中"}</td>
              <td className="small">{n.nanny || <span className="badge warn">待排班</span>}</td>
              <td>{n.feeding_ml ?? "—"}</td><td>{n.diaper ?? "—"}</td>
              <td className="small">{n.sleep_note}</td>
              <td><span className={n.status === "ongoing" ? "badge info" : "badge ok"}>{n.status === "ongoing" ? "托管中" : "已结束"}</span></td>
              <td>{n.status === "ongoing" && (
                <form action={finishNurseryLog}><input type="hidden" name="log_id" value={n.id} /><input type="hidden" name="room_id" value={d.room.id} /><button className="btn small">结束</button></form>
              )}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form action={addNurseryLog} className="formrow">
        <input type="hidden" name="resident_id" value={d.resident.id} />
        <input type="hidden" name="room_id" value={d.room.id} />
        <label className="f"><span>喂奶量 ml</span><input name="feeding_ml" type="number" /></label>
        <label className="f"><span>尿布次数</span><input name="diaper" type="number" /></label>
        <label className="f" style={{ gridColumn: "span 2" }}><span>睡眠备注</span><input name="sleep_note" /></label>
        <button className="btn primary small">开始一次托管登记</button>
      </form>
    </div>
  );
}

/* ---------------- 探访与消毒 ---------------- */
export function VisitSection({ d, me, disinfections }: { d: any; me: StaffUser; disinfections: any[] }) {
  const canReview = has(me, ["front_desk", "head_nurse", "admin", "director"]);
  const canFront = has(me, ["front_desk", "head_nurse", "admin"]);
  const disMap = new Map(disinfections.map((x) => [x.visit_id, x]));
  return (
    <div className="card">
      <h3>家属探访预约与消毒 <span className="cnt">探访权限：{d.resident.visit_policy}</span></h3>
      <table className="tbl">
        <thead><tr><th>访客</th><th>类型</th><th>时间</th><th>人数</th><th>状态</th><th>消毒</th><th>临时事由</th><th>操作</th></tr></thead>
        <tbody>
          {d.visits.map((v: any) => {
            const dis = disMap.get(v.id);
            return (
              <tr key={v.id}>
                <td>{v.visitor_name}<div className="small muted">{v.visitor_phone}</div></td>
                <td>{v.kind === "temporary" ? <span className="badge warn">临时增加</span> : <span className="badge">常规</span>}</td>
                <td className="mono small">{v.visit_date} {v.visit_time}</td>
                <td>{v.visitors_cnt}</td>
                <td><span className={v.status === "rejected" ? "badge bad" : v.status === "checked_in" ? "badge brand" : "badge info"}>{VISIT_STATUS[v.status]}</span></td>
                <td className="small">{dis ? <span className="badge ok">已消毒：{dis.method}</span> : <span className="badge warn">未登记</span>}</td>
                <td className="small muted">{v.temp_reason}</td>
                <td>
                  <div className="flex wrap">
                    {v.status === "requested" && canReview && (
                      <>
                        <form action={reviewVisit}><input type="hidden" name="visit_id" value={v.id} /><input type="hidden" name="room_id" value={d.room.id} /><input type="hidden" name="decision" value="approve" /><button className="btn small">批准</button></form>
                        <form action={reviewVisit}><input type="hidden" name="visit_id" value={v.id} /><input type="hidden" name="room_id" value={d.room.id} /><input type="hidden" name="decision" value="reject" /><button className="btn small danger">拒绝</button></form>
                      </>
                    )}
                    {v.status === "approved" && canFront && (
                      <form action={checkinVisit}><input type="hidden" name="visit_id" value={v.id} /><input type="hidden" name="room_id" value={d.room.id} /><button className="btn small">到访登记</button></form>
                    )}
                    {v.status === "checked_in" && (
                      <>
                        {canFront && !dis && (
                          <form action={addDisinfection} className="flex">
                            <input type="hidden" name="visit_id" value={v.id} /><input type="hidden" name="room_id" value={d.room.id} />
                            <select name="method" defaultValue="手消+鞋套+体温检测" style={{ width: 170 }}>
                              <option>手消+鞋套+体温检测</option><option>手消+口罩+物品紫外线消毒</option><option>全套二级防护消毒</option>
                            </select>
                            <button className="btn small">登记消毒</button>
                          </form>
                        )}
                        {canFront && <form action={finishVisit}><input type="hidden" name="visit_id" value={v.id} /><input type="hidden" name="room_id" value={d.room.id} /><button className="btn small">结束探访</button></form>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 异常事件 ---------------- */
export function IncidentListCard({ d }: { d: any }) {
  return (
    <div className="card">
      <h3>本房间异常协同 <Link className="btn small" href="/incidents">全部异常 →</Link></h3>
      {d.incidents.length === 0 && <div className="muted small">暂无异常。</div>}
      <ul className="timeline">
        {d.incidents.map((i: any) => (
          <li key={i.id}>
            <Link href={`/incidents/${i.id}`}>
              <span className="badge brand">{INCIDENT_TYPE[i.type]}</span>{" "}
              <span className={i.severity === "high" ? "badge bad" : i.severity === "medium" ? "badge warn" : "badge"}>{INCIDENT_STATUS[i.status]}</span>{" "}
              <b>{i.title}</b>
              <span className="cnt">（{i.action_cnt} 条协同记录）</span>
            </Link>
            <div className="t">{i.created_at} · 牵头角色：{i.lead_role}{i.dispute_to_headnurse ? " · 已同步护士长" : ""}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NewIncidentCard({ d, me }: { d: any; me: StaffUser }) {
  return (
    <div className="card">
      <h3>发起异常协同</h3>
      <form action={createIncident}>
        <input type="hidden" name="resident_id" value={d.resident.id} />
        <input type="hidden" name="room_id" value={d.room.id} />
        <div className="formrow">
          <label className="f"><span>类型</span>
            <select name="type">
              {Object.entries(INCIDENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="f"><span>等级</span>
            <select name="severity" defaultValue="medium"><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select>
          </label>
        </div>
        <label className="f"><span>标题</span><input name="title" required /></label>
        <label className="f"><span>描述（将按类型自动流转牵头角色：儿科/护士长/营养/前台/财务/主管）</span><textarea name="description" /></label>
        <button className="btn primary small">提交并流转</button>
      </form>
    </div>
  );
}

/* ---------------- 费用 ---------------- */
export function FeeSection({ d, me }: { d: any; me: StaffUser }) {
  const can = has(me, ["finance", "admin", "front_desk"]);
  const canSettle = has(me, ["finance", "admin"]);
  const total = d.fees.reduce((a: number, f: any) => a + Number(f.amount), 0);
  const unpaid = d.fees.filter((f: any) => f.status === "unpaid").reduce((a: number, f: any) => a + Number(f.amount), 0);
  return (
    <div className="card">
      <h3>费用明细 <span className="cnt">合计 {money(total)}，待收 {money(unpaid)}</span></h3>
      <table className="tbl mb8">
        <thead><tr><th>日期</th><th>项目</th><th>类型</th><th>金额</th><th>状态</th><th></th></tr></thead>
        <tbody>
          {d.fees.map((f: any) => (
            <tr key={f.id}>
              <td className="mono small">{f.occur_date}</td><td className="small">{f.item_name}</td>
              <td><span className="badge">{FEE_TYPE[f.fee_type]}</span></td>
              <td className="mono" style={{ color: f.amount < 0 ? "#2e7d4f" : undefined }}>{money(f.amount)}</td>
              <td><span className={f.status === "paid" ? "badge ok" : f.status === "refunded" ? "badge ok" : "badge warn"}>{FEE_STATUS[f.status]}</span></td>
              <td>{f.status === "unpaid" && canSettle && (
                <form action={settleFee}><input type="hidden" name="fee_id" value={f.id} /><input type="hidden" name="room_id" value={d.room.id} /><button className="btn small">收款</button></form>
              )}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {can && (
        <form action={addFee} className="formrow">
          <input type="hidden" name="resident_id" value={d.resident.id} />
          <input type="hidden" name="room_id" value={d.room.id} />
          <label className="f"><span>项目</span><input name="item_name" required placeholder="如：产康加课/房差/退费" /></label>
          <label className="f"><span>类型</span><select name="fee_type">{Object.entries(FEE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="f"><span>金额（退款填负数）</span><input name="amount" type="number" step="0.01" required /></label>
          <label className="f"><span>日期</span><input name="occur_date" type="date" /></label>
          <button className="btn primary small" style={{ alignSelf: "end" }}>开单/退费</button>
        </form>
      )}
    </div>
  );
}

/* ---------------- 家属沟通 ---------------- */
export function MessageSection({ d, me }: { d: any; me: StaffUser }) {
  return (
    <div className="card">
      <h3>围绕房间的家属沟通</h3>
      <ul className="timeline mb8">
        {d.messages.map((m: any) => (
          <li key={m.id}>
            <b>{m.sender_name}</b> <span className={m.sender_type === "family" ? "badge brand" : "badge info"}>{m.sender_type === "family" ? "家属" : "中心"}</span>
            <div>{m.content}</div><div className="t">{m.created_at}</div>
          </li>
        ))}
      </ul>
      <form action={sendMessage}>
        <input type="hidden" name="resident_id" value={d.resident.id} />
        <input type="hidden" name="room_id" value={d.room.id} />
        <label className="f"><span>发送给家属</span><input name="content" required placeholder="同步护理/探访/费用信息……" /></label>
        <button className="btn primary small">发送</button>
      </form>
    </div>
  );
}

/* ---------------- 家属反馈 ---------------- */
export function FeedbackSection({ d }: { d: any }) {
  return (
    <div className="card">
      <h3>家属反馈（影响护理师排班与口碑）</h3>
      {d.feedbacks.length === 0 && <div className="muted small">暂无反馈。</div>}
      {d.feedbacks.map((f: any) => (
        <div key={f.id} className="tight" style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
          <div className="between">
            <b>{f.target_staff_id ? f.staff_name : "中心整体"}</b>
            <span className="badge warn">{"★".repeat(Number(f.score))}{"☆".repeat(5 - Number(f.score))}</span>
          </div>
          <div className="small">{f.content}</div>
          {f.tags && <div className="small muted">标签：{f.tags}</div>}
          {f.schedule_impact && <div className="small" style={{ color: "#b03a3a" }}>排班处理：{f.schedule_impact}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 退所 ---------------- */
export function CheckoutCard({ d, me }: { d: any; me: StaffUser }) {
  const can = has(me, ["head_nurse", "director", "finance", "admin"]);
  if (!can || d.resident.status !== "inhouse") return null;
  return (
    <div className="card" style={{ borderColor: "#e2c8bd" }}>
      <h3>办理退所 / 提前退所</h3>
      <form action={processCheckout}>
        <input type="hidden" name="resident_id" value={d.resident.id} />
        <input type="hidden" name="room_id" value={d.room.id} />
        <div className="formrow">
          <label className="f"><span>出所日期</span><input name="checkout_date" type="date" required /></label>
          <label className="f"><span>是否提前退所</span>
            <select name="early" defaultValue="0"><option value="0">正常到期</option><option value="1">提前退所（争议同步护士长）</option></select>
          </label>
        </div>
        <label className="f"><span>回访建议（随护理计划归档）</span><textarea name="followup_advice" placeholder="产后复查/黄疸随访/喂养指导……" /></label>
        <button className="btn primary small">结算并出所归档（自动建立 14/42 天随访）</button>
      </form>
    </div>
  );
}
