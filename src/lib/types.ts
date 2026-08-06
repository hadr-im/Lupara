export type Role = "admin" | "ocp" | "ocvp" | "oc";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** null for admin — can see every workspace */
  workspaceId: string | null;
  /** non-null only for OC — restricts to one key area */
  keyAreaId: string | null;
  hue: number;
};

export type AppNotification = {
  id: string;
  type: "lead_pending" | "lead_validated" | "lead_rejected" | "task_assigned" | "review_submitted" | "review_approved" | "review_rejected" | "partner_confirmed";
  title: string;
  message: string;
  leadId?: string;
  taskId?: string;
  prPersonId?: string;
  /** role that should receive this notification */
  targetRole: Role;
  /** null means every user of targetRole; otherwise only a specific user */
  targetUserId: string | null;
  workspaceId: string;
  read: boolean;
  createdAt: string;
};

// ── Stage transition data ────────────────────────────────────────────────────

export type ContactedData = {
  contactOutput: string;  // what was the output of the contact
  method: "cold_call" | "cold_email";
};

export type MeetingData = {
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM
  format: "google_meet" | "physical";
  location?: string;
};

export type ProposalData = {
  estimatedBudget: number; // TND
};

export type ConfirmedData = {
  amount: number;          // TND — actual confirmed amount
  services: string;        // comma-separated list of services
  links: string;           // logo / service links (comma-separated)
};

export type LostData = {
  reason: string;
  openToFuture: boolean;
};

export type LeadStageData = {
  contacted?: ContactedData;
  meeting?: MeetingData;
  proposal?: ProposalData;
  confirmed?: ConfirmedData;
  lost?: LostData;
};

// ── Public Relations ─────────────────────────────────────────────────────────

export type PRStageId = "contact" | "contacted" | "negotiation" | "confirmed" | "rejected";

export const PR_STAGE_ORDER: Record<PRStageId, number> = {
  contact: 0,
  contacted: 1,
  negotiation: 2,
  confirmed: 3,
  rejected: 4,
};

export const prStages = [
  { id: "contact" as const,     name: "To Contact",   tone: "info" },
  { id: "contacted" as const,   name: "Contacted",    tone: "info" },
  { id: "negotiation" as const, name: "Negotiation",  tone: "warning" },
  { id: "confirmed" as const,   name: "Confirmed",    tone: "success" },
  { id: "rejected" as const,    name: "Rejected",     tone: "destructive" },
] as const;

export type PRPerson = {
  id: string;
  workspaceId: string;  // which workspace they originate from (shown in all)
  type: "speaker" | "media";
  name: string;
  organization: string;
  email: string;
  phone: string;
  topic?: string;        // for speakers
  mediaType?: string;    // for media (TV, radio, online, press…)
  stage: PRStageId;
  stageNotes: Record<string, string>; // stage-id → notes the user filled in
  confirmedDate?: string; // YYYY-MM-DD (when confirmed)
  confirmedTime?: string; // HH:MM
  rejectedReason?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeHue?: number;
  updatedAt: string;
  biography?: string;
  imageUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  talkId?: string;
  location?: string;
};

// ── Logistics ────────────────────────────────────────────────────────────────

export type LogisticsStageId = "new" | "contacted" | "negotiation" | "confirmed" | "lost";

export const LOGISTICS_STAGE_ORDER: Record<LogisticsStageId, number> = {
  new: 0, contacted: 1, negotiation: 2, confirmed: 3, lost: 4,
};

export const logisticsStages = [
  { id: "new" as const,         name: "New Request",  tone: "info" },
  { id: "contacted" as const,   name: "Contacted",    tone: "info" },
  { id: "negotiation" as const, name: "Negotiation",  tone: "warning" },
  { id: "confirmed" as const,   name: "Confirmed",    tone: "success" },
  { id: "lost" as const,        name: "Lost",         tone: "destructive" },
] as const;

export type LogisticsItem = {
  id: string;
  workspaceId: string;
  keyAreaId: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  itemType: string;       // e.g. "Tables", "Chairs", "Stage Equipment"
  quantity: number;
  unit: string;           // "units", "kg", "sets", etc.
  notes: string;
  stage: LogisticsStageId;
  assigneeId?: string;
  assigneeName?: string;
  assigneeHue?: number;
  validated: boolean;
  pendingValidation: boolean;
  updatedAt: string;
  tags: string[];
};
