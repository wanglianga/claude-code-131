import Nav from "@/components/Nav";
import { requireStaff } from "@/lib/auth";
import { getMyTasks } from "@/lib/queries";
import { updatePlanStatus, doneRehab, nannyLeave } from "@/lib/actions";
import { PLAN_CAT, REHAB_STATUS, SHIFT } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const me = await requireStaff();
  const { plans, rehabs, schedule } = await getMyTasks(me.id, me.role);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav active="/tasks" />
      <main className="page">
        <h1>我的任务 · {me.name}</h1>
        <div className="grid cols-2">
          <div className="card">
            <h3>待执行护理计划 <span className="cnt">{plans.length} 项</span></h3>
            {plans.length === 0 && <div className="muted small">暂无待执行任务。</div>}
            <table className="tbl">
              <thead><tr><th>房间</th><th>项目</th><th>时间</th><th>频次</th><th>状态</th><th></th></tr></thead>
              <tbody>
                {plans.map((p: any) => (
                  <tr key={p.id}>
                    <td><a href={`/rooms/${p.room_id ?? ""}`}>{p.room_no}</a><div className="small muted">{p.mother} · {p.baby_name}</div></td>
                    <td><span className="badge brand">{PLAN_CAT[p.category]}</span> {p.title}</td>
                    <td className="mono small">{p.plan_time}</td>
                    <td className="small">{p.frequency}</td>
                    <td><span className={p.status === "delayed" ? "badge warn" : "badge info"}>{p.status === "delayed" ? "已延期" : "待执行"}</span></td>
                    <td>
                      <form action={updatePlanStatus}>
                        <input type="hidden" name="plan_id" value={p.id} />
                        <input type="hidden" name="room_id" value={p.room_id ?? ""} />
                        <input type="hidden" name="status" value="done" />
                        <button className="btn small">完成</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>产康课程（产康师）</h3>
            {rehabs.length === 0 && <div className="muted small">无排期课程。</div>}
            <table className="tbl">
              <tbody>
                {rehabs.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.course_name}<div className="small muted">{r.room_no} · {r.mother}</div></td>
                    <td className="mono small">{r.start_time}</td>
                    <td><span className={r.status === "delayed" ? "badge warn" : "badge info"}>{REHAB_STATUS[r.status]}</span></td>
                    <td>
                      <form action={doneRehab}>
                        <input type="hidden" name="rehab_id" value={r.id} />
                        <input type="hidden" name="room_id" value={r.room_id ?? ""} />
                        <button className="btn small">完成</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mt16">我的排班（未来 14 天）</h3>
            <table className="tbl">
              <tbody>
                {schedule.map((s: any) => (
                  <tr key={s.id}>
                    <td className="mono">{s.work_date}</td>
                    <td><span className={s.shift === "leave" ? "badge bad" : s.shift === "night" ? "badge info" : "badge ok"}>{SHIFT[s.shift]}</span></td>
                    <td className="small">{s.room_no || "—"}</td>
                    <td className="small muted">{s.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {me.role === "nanny" && (
              <>
                <h3 className="mt16">月嫂请假登记</h3>
                <form action={nannyLeave} className="formrow">
                  <input type="hidden" name="staff_id" value={me.id} />
                  <label className="f"><span>请假日期</span><input name="work_date" type="date" defaultValue={today} required /></label>
                  <label className="f" style={{ gridColumn: "span 2" }}><span>事由</span><input name="reason" required placeholder="家中急事等" /></label>
                  <button className="btn danger small">提交请假（自动通知护理主管调班）</button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
