import Link from "next/link";
import Nav from "@/components/Nav";
import { getRoomOverview } from "@/lib/queries";
import { requireStaff } from "@/lib/auth";
import { DELIVERY, FEEDING, JAUNDICE } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  await requireStaff();
  const rooms = await getRoomOverview();
  const openInc = rooms.reduce((a, r) => a + Number(r.open_incidents), 0);
  const highInc = rooms.reduce((a, r) => a + Number(r.high_incidents), 0);
  const unpaid = rooms.reduce((a, r) => a + Number(r.unpaid_amount || 0), 0);

  return (
    <>
      <Nav active="/rooms" />
      <main className="page">
        <h1>房间总览 · 一房间一台账</h1>
        <div className="sub mb12">护理主管/护士长/管理者按房间查看护理动作、家属沟通、费用变化与异常处置，协同处理高敏感客诉。</div>
        <div className="grid cols-4 mb12">
          <div className="card stat"><span className="num">{rooms.length}</span><span className="lbl">房间总数</span></div>
          <div className="card stat"><span className="num">{rooms.filter(r => r.resident_id).length}</span><span className="lbl">在住产妇</span></div>
          <div className="card stat"><span className="num" style={{ color: highInc ? "#b03a3a" : undefined }}>{openInc}（高危 {highInc}）</span><span className="lbl">未结异常</span></div>
          <div className="card stat"><span className="num mono">¥{unpaid.toLocaleString()}</span><span className="lbl">待收费用合计</span></div>
        </div>

        <div className="grid cols-2">
          {rooms.map((r) => (
            <Link key={r.room_id} href={`/rooms/${r.room_id}`} className="card" style={{ display: "block" }}>
              <div className="between mb8">
                <h3 style={{ margin: 0 }}>
                  {r.room_no}
                  <span className="badge brand">{r.package_name || "未设套餐"} · {r.room_type || "—"}</span>
                  {r.room_status === "occupied" && <span className="badge ok">在住</span>}
                  {r.room_status === "cleanup" && <span className="badge warn">清扫中</span>}
                  {r.room_status === "available" && <span className="badge">空房</span>}
                </h3>
                <span className="muted small">进入房间 →</span>
              </div>
              {r.resident_id ? (
                <>
                  <div className="small mb8">
                    <b>{r.mother}</b>（宝宝：{r.baby_name}）· {DELIVERY[r.delivery_type]} · 产后约 {Number(r.postpartum_days) + 0} 天起住，
                    当前产后第 {Number(r.postpartum_days) + 0 + Math.round((Date.now() - new Date(r.checkin_date).getTime()) / 864e5)} 天 · {FEEDING[r.feeding]}
                  </div>
                  <div className="flex wrap">
                    <span className="badge info">今日护理 {r.today_records}</span>
                    <span className="badge info">今日沟通 {r.today_msgs}</span>
                    {r.last_jaundice === "high" && <span className="badge bad">黄疸偏高</span>}
                    {r.last_jaundice === "moderate" && <span className="badge warn">黄疸中度</span>}
                    {Number(r.open_incidents) > 0 && <span className={Number(r.high_incidents) > 0 ? "badge bad" : "badge warn"}>未结异常 {r.open_incidents}</span>}
                    {Number(r.unpaid_amount) > 0 && <span className="badge warn">待收 ¥{Number(r.unpaid_amount).toLocaleString()}</span>}
                  </div>
                </>
              ) : (
                <div className="muted small">
                  {r.room_status === "cleanup"
                    ? "最近一位产妇已出所，房间清扫中；历史护理计划、异常、结算与随访见「出所与随访」。"
                    : "暂无在住产妇，可安排入住。"}
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
