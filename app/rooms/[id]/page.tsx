import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { getRoomDetail } from "@/lib/queries";
import { requireStaff } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  ProfileCard, BabySection, CareSection, DoctorSection, MealSection, RehabSection,
  NurserySection, VisitSection, IncidentListCard, NewIncidentCard, FeeSection,
  MessageSection, FeedbackSection, CheckoutCard,
} from "@/components/RoomSections";

export const dynamic = "force-dynamic";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const me = await requireStaff();
  const d = await getRoomDetail(Number(params.id));
  if (!d) notFound();
  const staff = await query<any>(
    "SELECT id, name, role FROM staff WHERE active=1 AND role IN ('nurse','head_nurse','nanny','rehab','dietitian','pediatrician') ORDER BY role, id");
  const disinfections = d.resident
    ? await query<any>(
        `SELECT vd.* FROM visit_disinfections vd JOIN visits v ON v.id=vd.visit_id WHERE v.resident_id=?`, [d.resident.id])
    : [];

  return (
    <>
      <Nav active="/rooms" />
      <main className="page">
        <div className="between mb12">
          <div>
            <h1 style={{ marginBottom: 2 }}>{d.room.room_no} · {d.room.package_name || "未设套餐"}</h1>
            <div className="sub">
              {d.resident
                ? <>在住：{d.resident.name}（宝宝 {d.resident.baby_name}）· 每日房费 ¥{Number(d.room.daily_price).toLocaleString()} · 当前产后第 {d.resident.days_now} 天</>
                : "当前无在住产妇（历史数据见「出所与随访」）"}
            </div>
          </div>
          <a className="btn" href="/rooms">← 返回房间总览</a>
        </div>

        {d.resident ? (
          <div className="grid cols-2">
            <ProfileCard d={d} />
            <IncidentListCard d={d} />
            <BabySection d={d} me={me} />
            <CareSection d={d} me={me} staff={staff} />
            <DoctorSection d={d} me={me} />
            <MealSection d={d} me={me} />
            <RehabSection d={d} me={me} />
            <NurserySection d={d} me={me} />
            <VisitSection d={d} me={me} disinfections={disinfections} />
            <NewIncidentCard d={d} me={me} />
            <FeeSection d={d} me={me} />
            <MessageSection d={d} me={me} />
            <FeedbackSection d={d} />
            <CheckoutCard d={d} me={me} />
          </div>
        ) : (
          <div className="card">
            <h3>房间 {d.room.room_no}</h3>
            <div className="muted">套餐：{d.room.package_name || "—"}（{d.room.room_type || "—"}），每日 ¥{Number(d.room.daily_price || 0).toLocaleString()}</div>
            <div className="mt8">赠品：{d.gifts.map((g: any) => `${g.name}×${g.qty}`).join("；") || "—"}</div>
            <div className="mt8">状态：{d.room.status === "cleanup" ? "清扫中，可安排下一位入住" : "空房"}</div>
          </div>
        )}
      </main>
    </>
  );
}
