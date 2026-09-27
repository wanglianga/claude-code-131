import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { exec, queryOne } from "./db";

export type StaffRole =
  | "admin" | "director" | "head_nurse" | "nurse" | "pediatrician"
  | "dietitian" | "rehab" | "nanny" | "front_desk" | "finance";

export interface StaffUser {
  kind: "staff";
  id: number;
  username: string;
  name: string;
  role: StaffRole;
  rating: number;
}
export interface FamilyUser {
  kind: "family";
  id: number;
  username: string;
  name: string;
  relation: string;
  room_id: number | null;
  visit_level: "full" | "summary" | "none";
}
export type Principal = StaffUser | FamilyUser;

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "中心管理者",
  director: "护理主管",
  head_nurse: "护士长",
  nurse: "护理师",
  pediatrician: "儿科医生",
  dietitian: "营养师",
  rehab: "产康师",
  nanny: "月嫂",
  front_desk: "前台",
  finance: "财务",
};

export const ROLE_HOME: Record<StaffRole, string> = {
  admin: "/rooms",
  director: "/rooms",
  head_nurse: "/rooms",
  nurse: "/tasks",
  pediatrician: "/rooms",
  dietitian: "/rooms",
  rehab: "/tasks",
  nanny: "/tasks",
  front_desk: "/rooms",
  finance: "/finance",
};

const COOKIE = "yz_session";
const TTL_HOURS = 12;

export async function createSession(kind: "staff" | "family", id: number): Promise<string> {
  const token = crypto.randomBytes(20).toString("hex");
  await exec(
    "INSERT INTO sessions (token, principal_type, principal_id, expires_at) VALUES (?,?,?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
    [token, kind, id, TTL_HOURS]
  );
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL_HOURS * 3600 });
  return token;
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await exec("DELETE FROM sessions WHERE token=?", [token]);
  cookies().delete(COOKIE);
}

export async function getPrincipal(): Promise<Principal | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const s = await queryOne<{ principal_type: "staff" | "family"; principal_id: number }>(
    "SELECT principal_type, principal_id FROM sessions WHERE token=? AND expires_at > NOW()",
    [token]
  );
  if (!s) return null;
  if (s.principal_type === "staff") {
    const u = await queryOne<any>("SELECT id, username, name, role, rating FROM staff WHERE id=? AND active=1", [s.principal_id]);
    if (!u) return null;
    return { kind: "staff", ...u };
  }
  const f = await queryOne<any>("SELECT id, username, name, relation, room_id, visit_level FROM family_users WHERE id=?", [s.principal_id]);
  if (!f) return null;
  return { kind: "family", ...f };
}

export async function requireUser(): Promise<Principal> {
  const p = await getPrincipal();
  if (!p) redirect("/login");
  return p;
}

export async function requireStaff(roles?: StaffRole[]): Promise<StaffUser> {
  const p = await requireUser();
  if (p.kind !== "staff") redirect("/family");
  if (roles && !roles.includes(p.role)) redirect("/rooms");
  return p;
}

export async function requireFamily(): Promise<FamilyUser> {
  const p = await requireUser();
  if (p.kind !== "family") redirect("/rooms");
  return p;
}
