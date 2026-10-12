export type Role = "owner" | "designer" | "intern";
export type Member = { id: string; name: string; role: Role; roleLabel: string; isExpert: boolean; photoUrl: string | null; joinedAt: string };
export type Salon = { id: string; name: string; myRole: Role; inviteCode: string | null; members: Member[] };
