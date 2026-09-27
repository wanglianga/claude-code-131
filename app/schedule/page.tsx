import Nav from "@/components/Nav";
import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { getScheduleBoard } from "@/lib/queries";
import { setSchedule, nannyLeave, setFeedbackImpact } from "@/lib/actions";
import { SHIFT } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const me = await requireStaff();
  const { staff, rows, feedbacks } = await getScheduleBoard();
  const canManage = ["director", "head_nurse", "admin"].includes(me.role);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav active="/schedule" />
      <main className="page">
        <h1>产康师/月嫂排班与口碑</h1>
        <div className="sub mb12">护理主管与护士长统一排班；月嫂请假自动触发调班异常；家属反馈直接影响护理师评分与派单。</div>

        <div className="grid cols-2">
          <div className="card">
            <h3>员工口碑榜</h3>
            <table className="tbl">
              <thead><tr><th>员工</th><th>角色</th><th>评分</th><th>反馈数</th></tr></thead>
              <tbody>
                {[...staff].sort((a, b) => Number(b.rating) - Number(a.rating)).map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.name}{s.id === me.id ? "（我）" : ""}</td>
                    <td className="small">{ROLE_LABEL[s.role as keyof typeof ROLE_LABEL]}</td>
                    <td><span className={Number(s.rating) < 4.5 ? "badge bad" : "badge ok"}>★ {s.rating}</span></td>
                    <td>{s.feedback_cnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>未来 7 天排班</h3>
            <table className="tbl">
              <thead><tr><th>日期</th><th>员工</th><th>班次</th><th>房间</th><th>备注</th></tr></thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono small">{r.work_date}</td>
                    <td className="small">{r.staff_name}（{ROLE_LABEL[r.role as keyof typeof ROLE_LABEL]}）</td>
                    <td><span className={r.shift === "leave" ? "badge bad" : r.shift === "night" ? "badge info" : r.shift === "off" ? "badge" : "badge ok"}>{SHIFT[r.shift]}</span></td>
                    <td>{r.room_no || "—"}</td>
                    <td className="small muted">{r.remark}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="muted">暂无排班。</td></tr>}
              </tbody>
            </table>
          </div>

          {canManage && (
            <div className="card">
              <h3>排班 / 调班登记</h3>
              <form action={setSchedule} className="formrow">
                <label className="f"><span>员工</span>
                  <select name="staff_id">{staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}（{ROLE_LABEL[s.role as keyof typeof ROLE_LABEL]}）</option>)}</select>
                </label>
                <label className="f"><span>日期</span><input name="work_date" type="date" defaultValue={today} required /></label>
                <label className="f"><span>班次</span>
                  <select name="shift"><option value="day">白班</option><option value="night">夜班</option><option value="off">休息</option><option value="leave">请假</option></select>
                </label>
                <label className="f"><span>负责房间(可空)</span>
                  <select name="room_id"><option value="">—</option><option value="1">A301</option><option value="2">A302</option><option value="3">A303</option><option value="4">A201</option></select>
                </label>
                <label className="f" style={{ gridColumn: "1/-1" }}><span>备注（请假事由/调班原因/派单限制）</span><input name="remark" /></label>
                <button className="btn primary small">保存排班（同日重复自动覆盖）</button>
              </form>
              <div className="small muted mt8">月嫂本人也可在「我的任务」页提交请假，系统自动生成异常并通知护理主管调班。</div>
            </div>
          )}

          {me.role === "nanny" && (
            <div className="card">
              <h3>月嫂请假</h3>
              <form action={nannyLeave} className="formrow">
                <input type="hidden" name="staff_id" value={me.id} />
                <label className="f"><span>日期</span><input name="work_date" type="date" defaultValue={today} required /></label>
                <label className="f" style={{ gridColumn: "span 2" }}><span>事由</span><input name="reason" required /></label>
                <button className="btn danger small">提交请假</button>
              </form>
            </div>
          )}

          <div className="card" style={{ gridColumn: "1/-1" }}>
            <h3>家属反馈 → 排班处置（口碑闭环）</h3>
            <table className="tbl">
              <thead><tr><th>时间</th><th>房间产妇</th><th>对象</th><th>评分</th><th>内容</th><th>标签</th><th>排班处理{canManage ? "（可更新）" : ""}</th></tr></thead>
              <tbody>
                {feedbacks.map((f: any) => (
                  <tr key={f.id}>
                    <td className="mono small">{f.created_at}</td>
                    <td className="small">{f.mother}</td>
                    <td className="small">{f.staff_name || "中心整体"}</td>
                    <td><span className={f.score <= 2 ? "badge bad" : f.score >= 4 ? "badge ok" : "badge warn"}>{"★".repeat(f.score)}{"☆".repeat(5 - f.score)}</span></td>
                    <td className="small">{f.content}</td>
                    <td className="small muted">{f.tags}</td>
                    <td>
                      {canManage ? (
                        <form action={setFeedbackImpact} className="flex">
                          <input type="hidden" name="feedback_id" value={f.id} />
                          <input name="schedule_impact" defaultValue={f.schedule_impact || ""} placeholder="如：减少独立派单/优先派单/调房" style={{ minWidth: 220 }} />
                          <button className="btn small">保存</button>
                        </form>
                      ) : (
                        <span className="small" style={{ color: f.schedule_impact ? "#b03a3a" : undefined }}>{f.schedule_impact || "待主管处理"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
