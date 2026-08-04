export type Workspace = {
  id: string;
  name: string;
  short: string;
  type: "event" | "department";
  color: string;
  description: string;
  progress: number;
  eventDate?: string;
  /** If set, only these key-area IDs are shown in the sidebar */
  allowedAreas?: string[];
};

export const workspaces: Workspace[] = [
  { id: "tedx", name: "TEDx", short: "TX", type: "event", color: "from-fuchsia-500 to-rose-500", description: "Annual flagship conference", progress: 64, eventDate: "2025-07-15" },
  { id: "meetup", name: "MeetupPro", short: "MP", type: "event", color: "from-violet-500 to-indigo-500", description: "Monthly community meetups", progress: 42, eventDate: "2025-06-28" },
  { id: "pmewa", name: "PM & EWA", short: "PE", type: "department", color: "from-cyan-500 to-emerald-500", description: "Project mgmt & event-wide admin", progress: 78, allowedAreas: ["sales", "pr"] },
];

export const keyAreas = [
  { id: "dxp", name: "DXP / Experience", icon: "Sparkles" },
  { id: "sales", name: "Sales", icon: "TrendingUp" },
  { id: "logistics", name: "Logistics", icon: "Truck" },
  { id: "marketing", name: "Marketing", icon: "Megaphone" },
  { id: "pr", name: "Public Relations", icon: "Globe2" },
  { id: "content", name: "Content", icon: "FileText" },
];

export const stages = [
  { id: "new", name: "New Lead", tone: "info" },
  { id: "contacted", name: "Contacted", tone: "info" },
  { id: "meeting", name: "Meeting Scheduled", tone: "accent" },
  { id: "proposal", name: "Proposal Sent", tone: "accent" },
  { id: "negotiation", name: "Negotiation", tone: "warning" },
  { id: "waiting", name: "Waiting Response", tone: "warning" },
  { id: "confirmed", name: "Confirmed Partner", tone: "success" },
  { id: "lost", name: "Lost Deal", tone: "destructive" },
] as const;

export type StageId = typeof stages[number]["id"];

/** Maps each stage to its forward-progress index (0 = earliest) */
export const STAGE_ORDER: Record<StageId, number> = {
  new: 0,
  contacted: 1,
  meeting: 2,
  proposal: 3,
  negotiation: 4,
  waiting: 5,
  confirmed: 6,
  lost: 7,
};

export const COMPANY_TYPES = [
  "Startup", "Training Center", "Private University", "Store", "Agency",
  "Gym", "Company", "Small Business", "Coworking Space", "Beauty Center",
  "Education Abroad", "Language Center", "GR", "Industrial",
] as const;

export const TUNISIAN_CITIES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Siliana", "Sousse", "Monastir",
  "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès",
  "Medenine", "Tataouine", "Gafsa", "Tozeur", "Kebili", "Kef"
] as const;

export type Lead = {
  id: string;
  /** Which workspace this lead belongs to */
  workspaceId: string;
  /** Which key area owns this lead (for OC filtering) */
  keyAreaId: string;
  /** User ID of the OC assigned to this lead (undefined on seed data = visible to all non-OC roles) */
  assigneeId?: string;
  company: string;
  companyType: string;   // predefined or custom
  address: string;       // predefined city or custom
  industry: string;
  contact: string;
  email: string;
  phone: string;
  linkedin: string;
  interest: string;
  value: number;         // TND
  probability: number;
  source: string;
  stage: StageId;
  assignee: { name: string; initials: string; hue: number };
  tags: string[];
  validated: boolean;
  pendingValidation: boolean;
  updatedAt: string;
  notes: string;
  /** Details collected at each stage transition */
  stageData?: import("../types").LeadStageData;
};

const a = (name: string, hue: number) => ({
  name,
  initials: name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
  hue,
});

export const leads: Lead[] = [
  { id: "L-001", workspaceId: "tedx", keyAreaId: "sales", company: "Aurora Labs", companyType: "Startup", address: "Hay Riadh", industry: "Tech / AI", contact: "Hana Sato", email: "hana@aurora.io", phone: "+216 55 141 414", linkedin: "in/hanasato", interest: "Title sponsor", value: 75000, probability: 65, source: "Inbound", stage: "negotiation", assignee: a("Mira Khan", 295), tags: ["Hot", "Tier 1"], validated: true, pendingValidation: false, updatedAt: "2h ago", notes: "Wants speaking slot + booth.", stageData: { contacted: { contactOutput: "Interested, wants details", method: "cold_email" }, meeting: { date: "2025-06-16", time: "11:00", format: "google_meet" } } },
  { id: "L-002", workspaceId: "tedx", keyAreaId: "sales", company: "Vesper Coffee", companyType: "Company", address: "Sousse Ville", industry: "F&B", contact: "Theo Marin", email: "theo@vesper.co", phone: "+216 73 221 109", linkedin: "in/theomarin", interest: "Beverage partner", value: 12000, probability: 80, source: "Referral", stage: "confirmed", assignee: a("Jonas Rey", 200), tags: ["Renewal"], validated: true, pendingValidation: false, updatedAt: "1d ago", notes: "Contract signed; logistics in progress.", stageData: { contacted: { contactOutput: "Very interested, old partner", method: "cold_call" }, meeting: { date: "2025-06-10", time: "16:00", format: "physical", location: "Vesper HQ, Tunis" }, confirmed: { amount: 12000, services: "Beverage supply, logo on banner", links: "https://vesper.co/logo.png" } } },
  { id: "L-003", workspaceId: "tedx", keyAreaId: "sales", company: "NorthWind Bank", companyType: "Company", address: "Sahloul", industry: "Finance", contact: "Priya Aggarwal", email: "priya@northwind.com", phone: "+216 71 794 699", linkedin: "in/priya-ag", interest: "Gold sponsor", value: 45000, probability: 50, source: "Outbound", stage: "proposal", assignee: a("Mira Khan", 295), tags: ["Tier 1"], validated: true, pendingValidation: false, updatedAt: "5h ago", notes: "Awaiting committee review.", stageData: { contacted: { contactOutput: "Positive, needs committee approval", method: "cold_email" }, meeting: { date: "2025-06-12", time: "14:00", format: "physical", location: "NorthWind HQ" }, proposal: { estimatedBudget: 45000 } } },
  { id: "L-004", workspaceId: "tedx", keyAreaId: "sales", company: "Lumen Studio", companyType: "Agency", address: "Khezema", industry: "Creative", contact: "Eli Park", email: "eli@lumen.studio", phone: "+216 71 555 018", linkedin: "in/elipark", interest: "Stage design", value: 8500, probability: 70, source: "Event", stage: "meeting", assignee: a("Sofia Brand", 320), tags: ["Vendor"], validated: true, pendingValidation: false, updatedAt: "3h ago", notes: "Mood board sent.", stageData: { contacted: { contactOutput: "Agreed to meet", method: "cold_call" }, meeting: { date: "2025-06-14", time: "14:30", format: "physical", location: "Lumen HQ, Les Berges du Lac" } } },
  { id: "L-005", workspaceId: "tedx", keyAreaId: "sales", company: "Kettle & Co", companyType: "Store", address: "Msaken", industry: "Retail", contact: "Naomi Ito", email: "n.ito@kettle.shop", phone: "+216 73 123 456", linkedin: "in/naomi-ito", interest: "Goodie bag insert", value: 3500, probability: 40, source: "Inbound", stage: "contacted", assignee: a("Jonas Rey", 200), tags: [], validated: true, pendingValidation: false, updatedAt: "6h ago", notes: "", stageData: { contacted: { contactOutput: "Left message, awaiting callback", method: "cold_call" } } },
  { id: "L-006", workspaceId: "tedx", keyAreaId: "sales", company: "Helio Mobility", companyType: "Startup", address: "Hay Riadh", industry: "Mobility", contact: "Andre Costa", email: "andre@helio.com", phone: "+216 52 980 110", linkedin: "in/andrecosta", interest: "Transport partner", value: 22000, probability: 30, source: "Outbound", stage: "new", assignee: a("Mira Khan", 295), tags: ["New"], validated: false, pendingValidation: true, updatedAt: "20m ago", notes: "Awaiting admin validation.", assigneeId: "oc-tedx-sales" },
  { id: "L-007", workspaceId: "tedx", keyAreaId: "sales", company: "Quartz Cloud", companyType: "Startup", address: "Khezema", industry: "Tech / SaaS", contact: "Lina Park", email: "lina@quartz.cloud", phone: "+216 55 013 300", linkedin: "in/linapark", interest: "Tech partner", value: 30000, probability: 55, source: "Inbound", stage: "waiting", assignee: a("Sofia Brand", 320), tags: ["Tier 2"], validated: true, pendingValidation: false, updatedAt: "1d ago", notes: "Sent v2 deck, awaiting reply.", stageData: { contacted: { contactOutput: "Sent deck, waiting", method: "cold_email" }, meeting: { date: "2025-06-05", time: "10:00", format: "google_meet" }, proposal: { estimatedBudget: 30000 } } },
  { id: "L-008", workspaceId: "tedx", keyAreaId: "sales", company: "Brava Wines", companyType: "Company", address: "Akouda", industry: "F&B", contact: "Marco Liu", email: "marco@brava.wine", phone: "+216 73 456 789", linkedin: "in/marcoliu", interest: "VIP reception", value: 5000, probability: 10, source: "Referral", stage: "lost", assignee: a("Jonas Rey", 200), tags: [], validated: true, pendingValidation: false, updatedAt: "3d ago", notes: "Budget cut for Q4.", stageData: { contacted: { contactOutput: "Interested but budget issues", method: "cold_email" }, lost: { reason: "Budget cut for Q4, no funding available", openToFuture: true } } },
  { id: "L-009", workspaceId: "tedx", keyAreaId: "sales", company: "Orbit Studios", companyType: "Agency", address: "Sousse Ville", industry: "Media", contact: "Yuki Tanaka", email: "yuki@orbit.tv", phone: "+216 73 987 654", linkedin: "in/yukitanaka", interest: "Media partner", value: 18000, probability: 60, source: "Outbound", stage: "meeting", assignee: a("Mira Khan", 295), tags: ["Media"], validated: true, pendingValidation: false, updatedAt: "4h ago", notes: "Discovery call set for Friday.", stageData: { contacted: { contactOutput: "Very interested in media coverage", method: "cold_email" }, meeting: { date: "2025-06-13", time: "10:00", format: "google_meet" } } },
  { id: "L-010", workspaceId: "tedx", keyAreaId: "sales", company: "Verdant Fund", companyType: "Company", address: "Hay Riadh", industry: "VC", contact: "Aiden Brooks", email: "aiden@verdant.vc", phone: "+216 71 555 010", linkedin: "in/aidenbrooks", interest: "Innovation track", value: 60000, probability: 45, source: "Inbound", stage: "proposal", assignee: a("Sofia Brand", 320), tags: ["Strategic"], validated: true, pendingValidation: false, updatedAt: "8h ago", notes: "Looking for ROI metrics.", stageData: { contacted: { contactOutput: "Wants ROI data", method: "cold_call" }, meeting: { date: "2025-06-18", time: "09:30", format: "physical", location: "Verdant Capital Tower" }, proposal: { estimatedBudget: 60000 } } },
  { id: "L-011", workspaceId: "tedx", keyAreaId: "sales", company: "Polaris Print", companyType: "Industrial", address: "Kalaa Kebira", industry: "Manufacturing", contact: "Mei Chen", email: "mei@polaris.print", phone: "+216 73 888 777", linkedin: "in/meichen", interest: "Print materials", value: 4200, probability: 75, source: "Vendor list", stage: "negotiation", assignee: a("Jonas Rey", 200), tags: ["Vendor"], validated: true, pendingValidation: false, updatedAt: "1h ago", notes: "Quote v3 under review.", stageData: { contacted: { contactOutput: "Ready to provide quote", method: "cold_call" }, meeting: { date: "2025-06-08", time: "10:00", format: "physical", location: "Polaris HQ" } } },
  { id: "L-012", workspaceId: "tedx", keyAreaId: "sales", company: "Halo Beverages", companyType: "Company", address: "Bouficha", industry: "F&B", contact: "Owen Brett", email: "owen@halo.drinks", phone: "+216 73 305 014", linkedin: "in/owenbrett", interest: "Sampling booth", value: 2800, probability: 25, source: "Inbound", stage: "new", assignee: a("Sofia Brand", 320), tags: [], validated: false, pendingValidation: true, updatedAt: "45m ago", notes: "", assigneeId: "oc-tedx-sales" },
  { id: "L-013", workspaceId: "tedx", keyAreaId: "sales", company: "Strato Travel", companyType: "Company", address: "Sahloul", industry: "Travel", contact: "Iris Lund", email: "iris@strato.travel", phone: "+216 73 221 234", linkedin: "in/irislund", interest: "Travel partner", value: 14000, probability: 50, source: "Outbound", stage: "contacted", assignee: a("Mira Khan", 295), tags: [], validated: true, pendingValidation: false, updatedAt: "9h ago", notes: "", stageData: { contacted: { contactOutput: "Sent intro email, positive response", method: "cold_email" } } },
];

export const teamMembers = [
  { name: "Mira Khan", role: "Sales Lead", hue: 295 },
  { name: "Jonas Rey", role: "Account Exec", hue: 200 },
  { name: "Sofia Brand", role: "Account Exec", hue: 320 },
  { name: "Andre Costa", role: "BizDev", hue: 155 },
];

export const activity = [
  { who: "Mira", what: "moved Aurora Labs to Negotiation", when: "2h ago", tone: "accent" },
  { who: "Jonas", what: "confirmed Vesper Coffee partnership ✦ €12k", when: "1d ago", tone: "success" },
  { who: "Sofia", what: "sent proposal to Verdant Fund", when: "8h ago", tone: "info" },
  { who: "Admin", what: "approved 2 new leads", when: "30m ago", tone: "primary" },
  { who: "Mira", what: "scheduled meeting with Orbit Studios", when: "4h ago", tone: "accent" },
];

export const revenueSeries = [
  { month: "Jan", booked: 24, pipeline: 12 },
  { month: "Feb", booked: 31, pipeline: 18 },
  { month: "Mar", booked: 28, pipeline: 22 },
  { month: "Apr", booked: 42, pipeline: 26 },
  { month: "May", booked: 55, pipeline: 31 },
  { month: "Jun", booked: 68, pipeline: 38 },
  { month: "Jul", booked: 82, pipeline: 44 },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type Task = {
  id: string;
  workspaceId: string;
  areaId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: { name: string; hue: number };
  assigneeId?: string;
  /** Link to the work submitted for review (required for marketing/content tasks in review) */
  reviewLink?: string;
  /** Reason provided by admin/OCP/OCVP when rejecting a review */
  rejectionReason?: string;
  dueDate?: string;
  tags: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
};

export const taskColumns = [
  { id: "todo" as const, name: "To Do", tone: "info" },
  { id: "in_progress" as const, name: "In Progress", tone: "accent" },
  { id: "review" as const, name: "In Review", tone: "warning" },
  { id: "done" as const, name: "Done", tone: "success" },
];
export type TaskColumnId = "todo" | "in_progress" | "review" | "done";

export const tasks: Task[] = [
  // TEDx — Marketing
  { id: "T-001", workspaceId: "tedx", areaId: "marketing", title: "Design TEDx 2025 social media campaign", description: "Create visual assets for Instagram, LinkedIn and Twitter. Maintain TEDx brand guidelines throughout.", status: "in_progress", priority: "high", assignee: { name: "Imed Ayari", hue: 80 }, assigneeId: "oc-tedx-marketing", dueDate: "Jun 20", tags: ["Design", "Social"], comments: 5, createdAt: "2d ago", updatedAt: "4h ago" },
  { id: "T-002", workspaceId: "tedx", areaId: "marketing", title: "Write speaker announcement press release", description: "Draft and finalize press release for all 12 confirmed TEDx speakers.", status: "review", priority: "critical", assignee: { name: "Sara Malik", hue: 160 }, dueDate: "Jun 10", tags: ["PR", "Writing"], comments: 8, createdAt: "5d ago", updatedAt: "1h ago" },
  { id: "T-003", workspaceId: "tedx", areaId: "marketing", title: "Design email newsletter template", description: "Monthly newsletter template for 5k+ subscriber list.", status: "todo", priority: "medium", assignee: { name: "Imed Ayari", hue: 80 }, assigneeId: "oc-tedx-marketing", dueDate: "Jun 25", tags: ["Email", "Design"], comments: 2, createdAt: "1d ago", updatedAt: "1d ago" },
  { id: "T-004", workspaceId: "tedx", areaId: "marketing", title: "Coordinate with influencer partners", description: "Brief 3 micro-influencers for event promotion and coverage.", status: "todo", priority: "low", dueDate: "Jun 30", tags: ["Influencer"], comments: 0, createdAt: "3h ago", updatedAt: "3h ago" },
  { id: "T-005", workspaceId: "tedx", areaId: "marketing", title: "Create event hashtag strategy", description: "Define primary and secondary hashtags and community engagement rules.", status: "done", priority: "medium", assignee: { name: "Imed Ayari", hue: 80 }, assigneeId: "oc-tedx-marketing", dueDate: "Jun 5", tags: ["Social", "Strategy"], comments: 3, createdAt: "7d ago", updatedAt: "3d ago" },
  // TEDx — Logistics
  { id: "T-006", workspaceId: "tedx", areaId: "logistics", title: "Finalize venue contract for main hall", description: "Sign final contract with Palais des Congrès for 800-seat auditorium.", status: "in_progress", priority: "critical", assignee: { name: "Karim Nasser", hue: 220 }, dueDate: "Jun 8", tags: ["Venue", "Legal"], comments: 12, createdAt: "10d ago", updatedAt: "2h ago" },
  { id: "T-007", workspaceId: "tedx", areaId: "logistics", title: "Arrange catering for 500 attendees", description: "Coffee breaks, lunch buffet and VIP dinner. All dietary requirements collected.", status: "review", priority: "high", dueDate: "Jun 15", tags: ["Catering", "Vendors"], comments: 6, createdAt: "6d ago", updatedAt: "8h ago" },
  { id: "T-008", workspaceId: "tedx", areaId: "logistics", title: "Set up badge printing and check-in system", description: "Configure Eventbrite + badge printer integration. Test with 50 dummy tickets.", status: "todo", priority: "high", dueDate: "Jul 1", tags: ["Tech", "Check-in"], comments: 4, createdAt: "2d ago", updatedAt: "2d ago" },
  { id: "T-009", workspaceId: "tedx", areaId: "logistics", title: "Coordinate speaker accommodation", description: "Book hotel rooms for 8 international speakers. Confirm arrival schedules.", status: "done", priority: "high", assignee: { name: "Karim Nasser", hue: 220 }, dueDate: "Jun 1", tags: ["Speakers", "Travel"], comments: 9, createdAt: "14d ago", updatedAt: "5d ago" },
  // TEDx — DXP/Experience
  { id: "T-010", workspaceId: "tedx", areaId: "dxp", title: "Design attendee experience journey map", description: "Map the end-to-end attendee experience from registration to post-event follow-up.", status: "in_progress", priority: "high", assignee: { name: "Sara Malik", hue: 160 }, dueDate: "Jun 18", tags: ["UX", "Strategy"], comments: 7, createdAt: "4d ago", updatedAt: "6h ago" },
  { id: "T-011", workspaceId: "tedx", areaId: "dxp", title: "Plan networking session format", description: "Design structured speed-networking for 30 minutes between keynote sessions.", status: "review", priority: "medium", dueDate: "Jun 22", tags: ["Networking", "Format"], comments: 4, createdAt: "5d ago", updatedAt: "1d ago" },
  { id: "T-012", workspaceId: "tedx", areaId: "dxp", title: "Create event app wireframes", description: "Wireframes for schedule, speaker profiles, and live Q&A feature.", status: "todo", priority: "medium", dueDate: "Jun 28", tags: ["App", "Design"], comments: 2, createdAt: "1d ago", updatedAt: "1d ago" },
  { id: "T-013", workspaceId: "tedx", areaId: "dxp", title: "Speaker green room setup plan", description: "Spec out technical and comfort requirements for speaker preparation area.", status: "done", priority: "low", dueDate: "May 30", tags: ["Speakers", "Logistics"], comments: 1, createdAt: "15d ago", updatedAt: "8d ago" },
  // TEDx — Content
  { id: "T-014", workspaceId: "tedx", areaId: "content", title: "Write speaker bios for website", description: "12 speaker bios, max 150 words each. Requires photo and headshot approval.", status: "in_progress", priority: "high", dueDate: "Jun 12", tags: ["Writing", "Web"], comments: 6, createdAt: "3d ago", updatedAt: "3h ago" },
  { id: "T-015", workspaceId: "tedx", areaId: "content", title: "Design program booklet layout", description: "A5 format, 24 pages, English + Arabic. Send to printer by Jul 1.", status: "todo", priority: "critical", dueDate: "Jun 30", tags: ["Print", "Design"], comments: 3, createdAt: "2d ago", updatedAt: "2d ago" },
  { id: "T-016", workspaceId: "tedx", areaId: "content", title: "Produce post-event recap video script", description: "3-minute highlight reel script. Needs B-roll shot list for filming crew.", status: "todo", priority: "low", dueDate: "Jul 20", tags: ["Video", "Writing"], comments: 0, createdAt: "5h ago", updatedAt: "5h ago" },
  // TEDx — PR
  { id: "T-017", workspaceId: "tedx", areaId: "pr", title: "Secure media partnership with El Bilad TV", description: "Final negotiation for live coverage of opening keynote session.", status: "in_progress", priority: "critical", assignee: { name: "Karim Nasser", hue: 220 }, dueDate: "Jun 10", tags: ["Media", "Partnership"], comments: 11, createdAt: "6d ago", updatedAt: "1h ago" },
  { id: "T-018", workspaceId: "tedx", areaId: "pr", title: "Prepare media press kit", description: "Hi-res photos, branding assets, event factsheet, and speaker headshots.", status: "review", priority: "high", dueDate: "Jun 14", tags: ["Press", "Assets"], comments: 5, createdAt: "4d ago", updatedAt: "12h ago" },
  { id: "T-019", workspaceId: "tedx", areaId: "pr", title: "Publish 3 pre-event blog posts", description: "Interview-style posts featuring 3 keynote speakers. Schedule on LinkedIn + Medium.", status: "done", priority: "medium", dueDate: "Jun 5", tags: ["Blog", "Content"], comments: 7, createdAt: "10d ago", updatedAt: "4d ago" },
  // TEDx — Sales (task management layer, CRM pipeline is separate)
  { id: "T-020", workspaceId: "tedx", areaId: "sales", title: "Prepare sponsorship deck v4", description: "Update ROI metrics from last year and add new venue photos.", status: "in_progress", priority: "high", assignee: { name: "Nour Salhi", hue: 40 }, assigneeId: "oc-tedx-sales", dueDate: "Jun 12", tags: ["Deck", "Sponsors"], comments: 4, createdAt: "3d ago", updatedAt: "2h ago" },
  { id: "T-021", workspaceId: "tedx", areaId: "sales", title: "Send follow-up emails to Tier 1 prospects", description: "Personal follow-up to 5 Tier 1 prospects who haven't responded to proposal.", status: "todo", priority: "high", dueDate: "Jun 11", tags: ["Email", "Follow-up"], comments: 1, createdAt: "1d ago", updatedAt: "1d ago" },
  // MeetupPro — Marketing
  { id: "T-022", workspaceId: "meetup", areaId: "marketing", title: "Design June meetup event graphics", description: "Poster, social banners and email header for the monthly tech meetup.", status: "todo", priority: "high", dueDate: "Jun 20", tags: ["Design", "Social"], comments: 2, createdAt: "1d ago", updatedAt: "1d ago" },
  { id: "T-023", workspaceId: "meetup", areaId: "marketing", title: "Send invitations to community list", description: "Email blast to 200+ community list, follow up with Slack announcement.", status: "in_progress", priority: "high", dueDate: "Jun 18", tags: ["Email", "Community"], comments: 3, createdAt: "2d ago", updatedAt: "5h ago" },
  // MeetupPro — Logistics
  { id: "T-024", workspaceId: "meetup", areaId: "logistics", title: "Book co-working space for June event", description: "Reserve Hub 51 event space for 80 attendees. Confirm A/V setup.", status: "done", priority: "high", dueDate: "Jun 10", tags: ["Venue"], comments: 4, createdAt: "5d ago", updatedAt: "2d ago" },
  { id: "T-025", workspaceId: "meetup", areaId: "logistics", title: "Arrange A/V and streaming equipment", description: "Projector, clicker, lapel mic. Check stream setup for remote attendees.", status: "in_progress", priority: "medium", dueDate: "Jun 24", tags: ["Tech", "Streaming"], comments: 2, createdAt: "3d ago", updatedAt: "1d ago" },
  // PM & EWA
  { id: "T-026", workspaceId: "pmewa", areaId: "dxp", title: "Q2 budget allocation review", description: "Review actual vs planned spend for TEDx and MeetupPro. Reforecast Q3.", status: "in_progress", priority: "critical", dueDate: "Jun 15", tags: ["Finance", "Planning"], comments: 8, createdAt: "3d ago", updatedAt: "2h ago" },
  { id: "T-027", workspaceId: "pmewa", areaId: "dxp", title: "Annual impact report preparation", description: "Compile KPIs, testimonials and metrics for the annual impact report (50 pages).", status: "todo", priority: "high", dueDate: "Jul 30", tags: ["Report", "Writing"], comments: 5, createdAt: "1d ago", updatedAt: "1d ago" },
  { id: "T-028", workspaceId: "pmewa", areaId: "marketing", title: "Cross-event social media calendar", description: "Coordinate social posting calendar across TEDx and MeetupPro accounts.", status: "review", priority: "medium", dueDate: "Jun 17", tags: ["Social", "Coordination"], comments: 3, createdAt: "4d ago", updatedAt: "6h ago" },
];

// ─── Workspace Members ────────────────────────────────────────────────────────
export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "ocp" | "ocvp" | "oc";
  workspaceId?: string;
  keyAreaId?: string;
  hue: number;
  joinedAt: string;
  status: "active" | "invited" | "inactive";
};

export const workspaceMembers: WorkspaceMember[] = [
  { id: "admin-mehdi", name: "Mehdi Jdidi", email: "mehdi.jdidi@aiesec.net", role: "admin", hue: 260, joinedAt: "Jan 2025", status: "active" },
  { id: "admin-amine", name: "Amine Touati", email: "aminetouati@aiesec.net", role: "admin", hue: 200, joinedAt: "Jan 2025", status: "active" },
  { id: "admin-rayen", name: "Rayen Yahyaoui", email: "rayenyahyaoui@aiesec.net", role: "admin", hue: 140, joinedAt: "Jan 2025", status: "active" },
];

// ─── Sales Meetings ───────────────────────────────────────────────────────────
export type Meeting = {
  id: string;
  workspaceId: string;
  leadId?: string;
  partnerName: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  location: string;
  assignedOcId: string;
  assignedOcName: string;
  assignedOcHue: number;
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
};

export const meetings: Meeting[] = [
  { id: "M-001", workspaceId: "tedx", leadId: "L-009", partnerName: "Orbit Studios", date: "2025-06-13", time: "10:00", location: "Hub 51, Tunis – Room A", assignedOcId: "oc-tedx-sales", assignedOcName: "Nour Salhi", assignedOcHue: 40, notes: "Discovery call, bring media deck.", status: "scheduled" },
  { id: "M-002", workspaceId: "tedx", leadId: "L-004", partnerName: "Lumen Studio", date: "2025-06-14", time: "14:30", location: "Lumen HQ, Les Berges du Lac", assignedOcId: "oc-tedx-sales", assignedOcName: "Nour Salhi", assignedOcHue: 40, notes: "Stage design review meeting.", status: "scheduled" },
  { id: "M-003", workspaceId: "tedx", leadId: "L-001", partnerName: "Aurora Labs", date: "2025-06-16", time: "11:00", location: "Zoom – link in email", assignedOcId: "oc-tedx-sales", assignedOcName: "Nour Salhi", assignedOcHue: 40, notes: "Negotiation round 2. Confirm speaking slot.", status: "scheduled" },
  { id: "M-004", workspaceId: "tedx", leadId: "L-010", partnerName: "Verdant Fund", date: "2025-06-18", time: "09:30", location: "Verdant Capital Tower, Floor 12", assignedOcId: "oc-tedx-sales", assignedOcName: "Nour Salhi", assignedOcHue: 40, notes: "ROI presentation and innovation track brief.", status: "scheduled" },
  { id: "M-005", workspaceId: "tedx", leadId: "L-002", partnerName: "Vesper Coffee", date: "2025-06-10", time: "16:00", location: "Vesper HQ, Tunis", assignedOcId: "oc-tedx-sales", assignedOcName: "Nour Salhi", assignedOcHue: 40, notes: "Contract finalisation. Logistics handoff.", status: "completed" },
];

// ─── Calendar Events (area timeline) ─────────────────────────────────────────
export type CalendarEvent = {
  id: string;
  workspaceId: string;
  areaId: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  endDate?: string;
  type: "deadline" | "milestone" | "meeting" | "event" | "campaign";
  description: string;
  assignedTo?: string;
  color?: string;
};

export const calendarEvents: CalendarEvent[] = [
  { id: "CE-001", workspaceId: "tedx", areaId: "marketing", title: "Social campaign launch", date: "2025-06-20", type: "campaign", description: "Go-live for the 4-week TEDx 2025 social campaign." },
  { id: "CE-002", workspaceId: "tedx", areaId: "marketing", title: "Influencer briefing", date: "2025-06-17", type: "meeting", description: "Brief 3 micro-influencers on content guidelines." },
  { id: "CE-003", workspaceId: "tedx", areaId: "content", title: "Speaker bio deadline", date: "2025-06-12", type: "deadline", description: "All 12 speaker bios due from authors." },
  { id: "CE-004", workspaceId: "tedx", areaId: "content", title: "Program booklet to printer", date: "2025-06-30", type: "deadline", description: "Final PDF sent to Polaris Print." },
  { id: "CE-005", workspaceId: "tedx", areaId: "pr", title: "Media press kit live", date: "2025-06-14", type: "milestone", description: "Press kit published on tedx.tn/press." },
  { id: "CE-006", workspaceId: "tedx", areaId: "pr", title: "Pre-event blog post #1", date: "2025-06-10", type: "event", description: "Speaker spotlight – keynote 1." },
  { id: "CE-007", workspaceId: "tedx", areaId: "dxp", title: "Experience journey map done", date: "2025-06-18", type: "milestone", description: "Attendee journey map sign-off by OCP." },
  { id: "CE-008", workspaceId: "tedx", areaId: "dxp", title: "App wireframe review", date: "2025-06-28", type: "deadline", description: "Wireframes submitted to dev team." },
  { id: "CE-009", workspaceId: "meetup", areaId: "marketing", title: "Event graphics live", date: "2025-06-20", type: "milestone", description: "June meetup poster and banners published." },
  { id: "CE-010", workspaceId: "meetup", areaId: "marketing", title: "Community invitations sent", date: "2025-06-18", type: "campaign", description: "Email blast to 200+ member list." },
];

// ─── DXP: Physical Attraction ─────────────────────────────────────────────────
export type PhysicalAttraction = {
  id: string;
  workspaceId: string;
  title: string;
  venue: string;
  address: string;
  date: string; // "YYYY-MM-DD"
  time: string;
  capacity: number;
  description: string;
  setupNotes: string;
  status: "planning" | "confirmed" | "done";
};

export const physicalAttractions: PhysicalAttraction[] = [
  { id: "PA-001", workspaceId: "tedx", title: "Main Auditorium Setup", venue: "Palais des Congrès", address: "Avenue Mohamed V, Tunis 1002", date: "2025-07-14", time: "08:00", capacity: 800, description: "Full stage, lighting, and A/V setup for the main hall.", setupNotes: "LED walls on both sides. Stage requires 6h setup. Rehearsal at 17:00.", status: "confirmed" },
  { id: "PA-002", workspaceId: "tedx", title: "Networking Zone", venue: "Palais des Congrès – Foyer", address: "Avenue Mohamed V, Tunis 1002", date: "2025-07-15", time: "09:00", capacity: 300, description: "Open networking area with sponsor booths and coffee stations.", setupNotes: "8 sponsor booths 3x3m each. Vesper Coffee stand near entrance.", status: "planning" },
  { id: "PA-003", workspaceId: "tedx", title: "VIP Speaker Lounge", venue: "Palais des Congrès – Salon B", address: "Avenue Mohamed V, Tunis 1002", date: "2025-07-15", time: "08:00", capacity: 30, description: "Private room for speakers with A/V access and catering.", setupNotes: "Catering by Vesper. Display with schedule on TV. Privacy screen on door.", status: "planning" },
];

// ─── DXP: One-to-One meetings with OC members ─────────────────────────────────
export type OneToOne = {
  id: string;
  workspaceId: string;
  memberId: string;
  memberName: string;
  memberHue: number;
  date: string;
  time: string;
  duration: number; // minutes
  agenda: string;
  notes: string;
  status: "scheduled" | "done" | "cancelled";
  actionItems: string[];
};

export const oneToOnes: OneToOne[] = [
  { id: "OTO-001", workspaceId: "tedx", memberId: "oc-tedx-sales", memberName: "Nour Salhi", memberHue: 40, date: "2025-06-12", time: "10:00", duration: 30, agenda: "Pipeline review + Q2 target check", notes: "", status: "scheduled", actionItems: ["Share updated pipeline spreadsheet", "Review 3 pending leads"] },
  { id: "OTO-002", workspaceId: "tedx", memberId: "oc-tedx-marketing", memberName: "Imed Ayari", memberHue: 80, date: "2025-06-13", time: "11:00", duration: 30, agenda: "Campaign progress + social assets review", notes: "Discussed Instagram story format changes.", status: "done", actionItems: [] },
  { id: "OTO-003", workspaceId: "tedx", memberId: "oc-tedx-logistics", memberName: "Youssef Ben Amor", memberHue: 30, date: "2025-06-15", time: "14:00", duration: 45, agenda: "Venue logistics status + catering sign-off", notes: "", status: "scheduled", actionItems: ["Get catering invoice by Friday", "Confirm A/V delivery date"] },
  { id: "OTO-004", workspaceId: "tedx", memberId: "oc-tedx-content", memberName: "Aziz Trabelsi", memberHue: 350, date: "2025-06-16", time: "09:30", duration: 30, agenda: "Booklet layout feedback + speaker bio review", notes: "", status: "scheduled", actionItems: ["Send booklet PDF for review"] },
  { id: "OTO-005", workspaceId: "tedx", memberId: "oc-tedx-pr", memberName: "Rania Sfar", memberHue: 190, date: "2025-06-17", time: "10:30", duration: 30, agenda: "El Bilad TV contract + press kit review", notes: "", status: "scheduled", actionItems: ["Follow up on TV contract", "Finalize press kit PDF"] },
];

// ─── DXP: Agenda ─────────────────────────────────────────────────────────────
export type AgendaItem = {
  id: string;
  workspaceId: string;
  time: string;
  duration: number; // minutes
  title: string;
  speaker?: string;
  type: "keynote" | "workshop" | "break" | "networking" | "opening" | "closing" | "panel";
  location: string;
  notes: string;
  confirmed: boolean;
};

export const agendaItems: AgendaItem[] = [
  { id: "AG-001", workspaceId: "tedx", time: "08:30", duration: 30, title: "Registration & Welcome Coffee", type: "break", location: "Foyer", notes: "Vesper Coffee. Badge printing stations x4.", confirmed: true },
  { id: "AG-002", workspaceId: "tedx", time: "09:00", duration: 15, title: "Opening Ceremony", speaker: "Karim Nasser (OCP)", type: "opening", location: "Main Stage", notes: "Video intro + welcome speech.", confirmed: true },
  { id: "AG-003", workspaceId: "tedx", time: "09:15", duration: 20, title: "Keynote: The Future of Human Connection", speaker: "Dr. Aisha Kamara", type: "keynote", location: "Main Stage", notes: "Needs teleprompter + clicker. Pre-record backup video.", confirmed: true },
  { id: "AG-004", workspaceId: "tedx", time: "09:40", duration: 20, title: "Keynote: AI and Creativity", speaker: "Yann Moreau", type: "keynote", location: "Main Stage", notes: "Live demo laptop – test beforehand.", confirmed: true },
  { id: "AG-005", workspaceId: "tedx", time: "10:05", duration: 25, title: "Networking Break", type: "break", location: "Foyer", notes: "First networking rotation. Speed format.", confirmed: true },
  { id: "AG-006", workspaceId: "tedx", time: "10:30", duration: 20, title: "Keynote: Sustainable Cities", speaker: "Lena Fischer", type: "keynote", location: "Main Stage", notes: "", confirmed: false },
  { id: "AG-007", workspaceId: "tedx", time: "10:55", duration: 60, title: "Workshop: Design Thinking Sprint", type: "workshop", location: "Room B", notes: "Max 40 participants. Materials pre-set.", confirmed: true },
  { id: "AG-008", workspaceId: "tedx", time: "12:00", duration: 60, title: "Lunch Break", type: "break", location: "Terrace", notes: "Buffet by Vesper. Vegetarian and vegan options.", confirmed: true },
  { id: "AG-009", workspaceId: "tedx", time: "13:00", duration: 20, title: "Keynote: Rebuilding Trust in Institutions", speaker: "Omar Khalil", type: "keynote", location: "Main Stage", notes: "", confirmed: false },
  { id: "AG-010", workspaceId: "tedx", time: "13:25", duration: 45, title: "Panel: Youth Leadership in MENA", speaker: "4 panelists TBC", type: "panel", location: "Main Stage", notes: "Moderator: Sara Malik.", confirmed: false },
  { id: "AG-011", workspaceId: "tedx", time: "14:15", duration: 15, title: "Coffee Break", type: "break", location: "Foyer", notes: "", confirmed: true },
  { id: "AG-012", workspaceId: "tedx", time: "14:30", duration: 20, title: "Keynote: The Art of Unlearning", speaker: "Nadia Benyoucef", type: "keynote", location: "Main Stage", notes: "", confirmed: true },
  { id: "AG-013", workspaceId: "tedx", time: "14:55", duration: 20, title: "Keynote: Data as a Human Right", speaker: "Takeshi Mori", type: "keynote", location: "Main Stage", notes: "Slides in English + Arabic subtitle track.", confirmed: true },
  { id: "AG-014", workspaceId: "tedx", time: "15:20", duration: 30, title: "Final Networking", type: "networking", location: "Foyer", notes: "Open format. Sponsor booths open.", confirmed: true },
  { id: "AG-015", workspaceId: "tedx", time: "15:50", duration: 20, title: "Closing + Awards", speaker: "Karim Nasser (OCP)", type: "closing", location: "Main Stage", notes: "3 awards: Best Speaker, Most Engaged, Community Champion.", confirmed: true },
];

// ─── DXP: Email Templates ─────────────────────────────────────────────────────
export type EmailTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  type: "invitation" | "confirmation" | "reminder" | "dayof" | "followup";
  subject: string;
  preheader: string;
  body: string;
  updatedAt: string;
  approved: boolean;
};

export const emailTemplates: EmailTemplate[] = [
  { id: "ET-001", workspaceId: "tedx", name: "Participant Invitation", type: "invitation", subject: "You're Invited to TEDx Tunis 2025 🎤", preheader: "Join 500+ changemakers on July 15th for a day of ideas worth spreading.", body: `Dear {{FirstName}},

We are thrilled to invite you to TEDx Tunis 2025 — a day dedicated to ideas worth spreading.

📅 Date: July 15, 2025
📍 Venue: Palais des Congrès, Tunis
🕘 Time: 9:00 AM – 4:00 PM

This year's theme is **"Reconnect"** — exploring the bridges we build between technology, nature, community, and ourselves.

Reserve your seat: [REGISTER NOW]

Spaces are limited. We look forward to seeing you there.

Warmly,
The TEDx Tunis Team`, updatedAt: "3d ago", approved: true },
  { id: "ET-002", workspaceId: "tedx", name: "Registration Confirmation", type: "confirmation", subject: "Your TEDx Tunis 2025 Ticket is Confirmed ✓", preheader: "See you on July 15th! Here are your event details.", body: `Hi {{FirstName}},

Your registration is confirmed! 🎉

Here's what you need to know:

📅 Date: July 15, 2025
📍 Palais des Congrès, Tunis
🕘 Doors open at 8:30 AM
🎫 Your ticket: [TICKET_QR_CODE]

What to expect:
- 8 inspiring keynote talks
- 1 hands-on workshop
- 2 structured networking sessions
- Lunch and refreshments included

Add to calendar: [GOOGLE] [APPLE] [OUTLOOK]

See you there!
TEDx Tunis`, updatedAt: "2d ago", approved: true },
  { id: "ET-003", workspaceId: "tedx", name: "7-Day Reminder", type: "reminder", subject: "TEDx Tunis is 1 Week Away! 🗓️", preheader: "Make sure you're ready for July 15th.", body: `Hello {{FirstName}},

TEDx Tunis 2025 is just ONE WEEK away!

📅 July 15 | 9:00 AM | Palais des Congrès

💡 Quick tips:
- Download our event app for the live schedule
- Check in starts at 8:30 AM — arrive early!
- Dress code: Smart casual
- Parking available at [ADDRESS]

Your ticket: [VIEW TICKET]

Questions? Reply to this email or DM us @TEDxTunis.

See you in 7 days! 🚀`, updatedAt: "1d ago", approved: false },
  { id: "ET-004", workspaceId: "tedx", name: "Day-Of Instructions", type: "dayof", subject: "TODAY is TEDx Tunis Day! Here's Everything You Need 📍", preheader: "Doors open at 8:30. Don't forget your ticket!", body: `Good morning {{FirstName}}!

Today is the day! Here's your quick guide:

⏰ 8:30 AM – Doors open (don't be late!)
📱 Show your QR ticket at entrance
🗺️ Palais des Congrès – main entrance on Avenue Mohamed V

Today's highlights:
09:15 – Opening keynote
10:05 – First networking session
12:00 – Lunch on the terrace
14:30 – Afternoon talks
15:50 – Closing + Awards

📲 Live updates: Follow @TEDxTunis or join our WhatsApp group [LINK]

See you in a few hours! 🎉`, updatedAt: "5h ago", approved: false },
];

// ─── DXP: D-Day Agenda Slots ─────────────────────────────────────────────────
export type DDaySlot = {
  id: string;
  workspaceId: string;
  time: string;       // "HH:MM"
  endTime: string;    // "HH:MM"
  task: string;
  location: string;
  assigneeIds: string[];
  assigneeNames: string[];
  assigneeHues: number[];
  notes?: string;
};

export const ddaySlots: DDaySlot[] = [
  { id: "DS-001", workspaceId: "tedx", time: "07:00", endTime: "08:00", task: "Venue setup & AV system check", location: "Main Hall", assigneeIds: ["oc-tedx-logistics", "oc-tedx-content"], assigneeNames: ["Youssef Ben Amor", "Aziz Trabelsi"], assigneeHues: [30, 350], notes: "Confirm projector + mic setup before 08:00." },
  { id: "DS-002", workspaceId: "tedx", time: "08:00", endTime: "09:00", task: "Registration & badge desk setup", location: "Main Entrance", assigneeIds: ["oc-tedx-logistics", "oc-tedx-pr"], assigneeNames: ["Youssef Ben Amor", "Rania Sfar"], assigneeHues: [30, 190] },
  { id: "DS-003", workspaceId: "tedx", time: "08:30", endTime: "10:00", task: "VIP welcome & sponsor check-in", location: "VIP Lane", assigneeIds: ["oc-tedx-sales", "oc-tedx-dxp"], assigneeNames: ["Nour Salhi", "Lina Hamdi"], assigneeHues: [40, 290] },
  { id: "DS-004", workspaceId: "tedx", time: "08:30", endTime: "09:30", task: "Atmosphere & registration photography", location: "Foyer", assigneeIds: ["oc-tedx-marketing"], assigneeNames: ["Imed Ayari"], assigneeHues: [80] },
  { id: "DS-005", workspaceId: "tedx", time: "09:00", endTime: "09:30", task: "Opening ceremony – media setup & Instagram live", location: "Main Stage", assigneeIds: ["oc-tedx-marketing", "oc-tedx-pr"], assigneeNames: ["Imed Ayari", "Rania Sfar"], assigneeHues: [80, 190] },
  { id: "DS-006", workspaceId: "tedx", time: "09:15", endTime: "12:00", task: "Sponsor booth management & VIP hosting", location: "Networking Zone", assigneeIds: ["oc-tedx-sales"], assigneeNames: ["Nour Salhi"], assigneeHues: [40] },
  { id: "DS-007", workspaceId: "tedx", time: "10:05", endTime: "12:00", task: "Networking session 1 facilitation", location: "Foyer", assigneeIds: ["oc-tedx-dxp"], assigneeNames: ["Lina Hamdi"], assigneeHues: [290] },
  { id: "DS-008", workspaceId: "tedx", time: "10:05", endTime: "12:00", task: "Morning talk coverage (photo + video)", location: "Stage / Foyer", assigneeIds: ["oc-tedx-marketing", "oc-tedx-content"], assigneeNames: ["Imed Ayari", "Aziz Trabelsi"], assigneeHues: [80, 350] },
  { id: "DS-009", workspaceId: "tedx", time: "11:45", endTime: "12:30", task: "Catering delivery & lunch coordination", location: "Terrace", assigneeIds: ["oc-tedx-logistics"], assigneeNames: ["Youssef Ben Amor"], assigneeHues: [30] },
  { id: "DS-010", workspaceId: "tedx", time: "12:00", endTime: "13:30", task: "VIP & sponsor lunch hosting", location: "Terrace – VIP Table", assigneeIds: ["oc-tedx-sales", "oc-tedx-dxp"], assigneeNames: ["Nour Salhi", "Lina Hamdi"], assigneeHues: [40, 290] },
  { id: "DS-011", workspaceId: "tedx", time: "13:00", endTime: "13:30", task: "Collect speaker presentation files & AV check", location: "AV Booth", assigneeIds: ["oc-tedx-content"], assigneeNames: ["Aziz Trabelsi"], assigneeHues: [350] },
  { id: "DS-012", workspaceId: "tedx", time: "14:15", endTime: "15:00", task: "Coffee break experience & networking 2", location: "Foyer", assigneeIds: ["oc-tedx-dxp", "oc-tedx-marketing"], assigneeNames: ["Lina Hamdi", "Imed Ayari"], assigneeHues: [290, 80] },
  { id: "DS-013", workspaceId: "tedx", time: "14:30", endTime: "15:45", task: "Afternoon talks – live coverage & stories", location: "Stage", assigneeIds: ["oc-tedx-marketing", "oc-tedx-pr"], assigneeNames: ["Imed Ayari", "Rania Sfar"], assigneeHues: [80, 190] },
  { id: "DS-014", workspaceId: "tedx", time: "15:50", endTime: "17:00", task: "Closing ceremony, awards & group photos", location: "Main Stage", assigneeIds: ["oc-tedx-sales", "oc-tedx-marketing", "oc-tedx-dxp", "oc-tedx-pr", "oc-tedx-content", "oc-tedx-logistics"], assigneeNames: ["Nour Salhi", "Imed Ayari", "Lina Hamdi", "Rania Sfar", "Aziz Trabelsi", "Youssef Ben Amor"], assigneeHues: [40, 80, 290, 190, 350, 30], notes: "All hands on deck." },
];

// ─── DXP: D-Day Dispatch ─────────────────────────────────────────────────────
export type DayDispatch = {
  id: string;
  workspaceId: string;
  memberId: string;
  memberName: string;
  memberHue: number;
  keyAreaId: string;
  zone: string;
  responsibilities: string[];
  timeSlots: Array<{ time: string; task: string; location: string }>;
  reportTo: string;
  notes: string;
};

export const dayDispatches: DayDispatch[] = [
  { id: "DD-001", workspaceId: "tedx", memberId: "oc-tedx-sales", memberName: "Nour Salhi", memberHue: 40, keyAreaId: "sales", zone: "VIP & Sponsor Area", responsibilities: ["Welcome VIP guests and sponsors", "Manage sponsor booth allocation", "Handle sponsor inquiries"], timeSlots: [{ time: "08:00", task: "Arrive and set up sponsor registration desk", location: "Foyer Entrance" }, { time: "08:30", task: "Welcome first VIP guests", location: "VIP Lane" }, { time: "09:00", task: "Ensure all sponsor booths are staffed", location: "Networking Zone" }, { time: "12:00", task: "Escort sponsors to VIP lunch table", location: "Terrace" }], reportTo: "Karim Nasser (OCP)", notes: "Sponsor gift bags under table 3." },
  { id: "DD-002", workspaceId: "tedx", memberId: "oc-tedx-marketing", memberName: "Imed Ayari", memberHue: 80, keyAreaId: "marketing", zone: "Social Media & Content", responsibilities: ["Live social coverage", "Collect photo/video content", "Manage hashtag and engagement"], timeSlots: [{ time: "08:30", task: "Shoot registration & atmosphere content", location: "Foyer" }, { time: "09:00", task: "Go live on Instagram Stories", location: "Stage" }, { time: "10:05", task: "Capture networking session footage", location: "Foyer" }, { time: "15:50", task: "Film closing ceremony and awards", location: "Main Stage" }], reportTo: "Sara Malik (OCVP)", notes: "Use TEDx Tunis Instagram credentials from the password manager." },
  { id: "DD-003", workspaceId: "tedx", memberId: "oc-tedx-logistics", memberName: "Youssef Ben Amor", memberHue: 30, keyAreaId: "logistics", zone: "Operations & Logistics", responsibilities: ["Oversee check-in system", "Coordinate catering delivery", "Manage venue staff and volunteers"], timeSlots: [{ time: "07:00", task: "Arrive for venue setup supervision", location: "Main Hall" }, { time: "08:00", task: "Test badge printers and scan system", location: "Check-in Zone" }, { time: "08:30", task: "Open check-in for attendees", location: "Entrance" }, { time: "11:45", task: "Coordinate catering setup for lunch", location: "Terrace" }], reportTo: "Karim Nasser (OCP)", notes: "Emergency contact for venue: +216 71 XX XX XX (stored in ops doc)." },
  { id: "DD-004", workspaceId: "tedx", memberId: "oc-tedx-dxp", memberName: "Lina Hamdi", memberHue: 290, keyAreaId: "dxp", zone: "Attendee Experience", responsibilities: ["Run networking sessions", "Manage attendee flow", "Handle experience touchpoints"], timeSlots: [{ time: "08:30", task: "Set up networking session materials", location: "Foyer" }, { time: "10:00", task: "Facilitate networking rotation", location: "Foyer" }, { time: "14:15", task: "Run afternoon coffee break format", location: "Foyer" }, { time: "15:20", task: "Facilitate final networking session", location: "Foyer" }], reportTo: "Sara Malik (OCVP)", notes: "Speed networking cards printed and in box labeled DXP." },
  { id: "DD-005", workspaceId: "tedx", memberId: "oc-tedx-content", memberName: "Aziz Trabelsi", memberHue: 350, keyAreaId: "content", zone: "Content & Media", responsibilities: ["Distribute program booklets", "Manage speaker support materials", "Coordinate with media crew"], timeSlots: [{ time: "08:30", task: "Distribute program booklets at entrance", location: "Entrance" }, { time: "09:00", task: "Brief media crew on shot list", location: "Backstage" }, { time: "13:00", task: "Collect speaker presentation files", location: "AV Booth" }], reportTo: "Sara Malik (OCVP)", notes: "200 booklets + 50 VIP gold editions stored backstage." },
  { id: "DD-006", workspaceId: "tedx", memberId: "oc-tedx-pr", memberName: "Rania Sfar", memberHue: 190, keyAreaId: "pr", zone: "Press & Media Relations", responsibilities: ["Welcome press and media partners", "Manage media accreditation", "Coordinate El Bilad TV crew"], timeSlots: [{ time: "08:00", task: "Set up press accreditation desk", location: "Press Entrance (Side)" }, { time: "08:30", task: "Greet El Bilad TV crew and briefing", location: "Media Room" }, { time: "09:00", task: "Position press photographers", location: "Press Pit" }, { time: "15:50", task: "Escort media to closing ceremony", location: "Main Stage" }], reportTo: "Karim Nasser (OCP)", notes: "Media credentials folder is in the PR binder on the press desk." },
];

// ─── DXP: WhatsApp Group Timeline ─────────────────────────────────────────────
export type WhatsAppMessage = {
  id: string;
  workspaceId: string;
  scheduledDate: string;
  scheduledTime: string;
  title: string;
  content: string;
  type: "welcome" | "reminder" | "update" | "info" | "dayof";
  sent: boolean;
  sentAt?: string;
};

export const whatsappTimeline: WhatsAppMessage[] = [
  { id: "WA-001", workspaceId: "tedx", scheduledDate: "2025-06-15", scheduledTime: "10:00", title: "Group Welcome Message", content: "🎉 Welcome to the TEDx Tunis 2025 Participant Group!\n\nYou're now officially part of our event community. We'll use this group to share important updates, reminders, and day-of information.\n\nEvent date: 📅 July 15, 2025\n📍 Palais des Congrès, Tunis\n\nStay tuned! – TEDx Tunis Team", type: "welcome", sent: true, sentAt: "2025-06-15 10:02" },
  { id: "WA-002", workspaceId: "tedx", scheduledDate: "2025-06-30", scheduledTime: "09:00", title: "2-Week Reminder", content: "⏳ 2 weeks to go until TEDx Tunis 2025!\n\nHere's what's coming:\n✅ 8 inspiring keynote talks\n✅ Workshop on Design Thinking\n✅ 2 networking sessions\n✅ Lunch & refreshments included\n\nMake sure your ticket QR code is saved. See you July 15! 🚀", type: "reminder", sent: false },
  { id: "WA-003", workspaceId: "tedx", scheduledDate: "2025-07-08", scheduledTime: "10:00", title: "1-Week Countdown", content: "🗓️ 1 WEEK LEFT!\n\nQuick checklist before TEDx Tunis:\n☐ Save your ticket QR\n☐ Plan your route to Palais des Congrès\n☐ Download the event app\n☐ Share the event with a friend!\n\nFull agenda drops this week – watch this space 👀", type: "reminder", sent: false },
  { id: "WA-004", workspaceId: "tedx", scheduledDate: "2025-07-12", scheduledTime: "11:00", title: "Full Agenda Released", content: "📋 THE AGENDA IS HERE!\n\n9:00 – Opening Ceremony\n9:15 – Dr. Aisha Kamara: The Future of Human Connection\n9:40 – Yann Moreau: AI and Creativity\n10:30 – Lena Fischer: Sustainable Cities\n...\n\nFull schedule: [LINK]\n\nPro tip: Arrive at 8:30 to grab coffee and great seats! ☕", type: "info", sent: false },
  { id: "WA-005", workspaceId: "tedx", scheduledDate: "2025-07-14", scheduledTime: "18:00", title: "Eve-of-Event Message", content: "🌅 Tomorrow is the day!\n\nReminder:\n📅 July 15, 2025\n⏰ Doors open: 8:30 AM\n📍 Palais des Congrès, Avenue Mohamed V\n🎫 Have your QR ticket ready at entrance\n\nParking available on-site.\n\nCan't wait to see you all! 🎤", type: "reminder", sent: false },
  { id: "WA-006", workspaceId: "tedx", scheduledDate: "2025-07-15", scheduledTime: "07:30", title: "Day-Of Morning Message", content: "🚀 GOOD MORNING — IT'S TEDX DAY!\n\nWe're ready for you!\n\n📍 Palais des Congrès, Tunis\n⏰ Doors open in 1 HOUR (8:30 AM)\n\n🎫 Don't forget your QR ticket!\n\nSee you very soon 🎉\n#TEDxTunis2025 #IdeasWorthSpreading", type: "dayof", sent: false },
  { id: "WA-007", workspaceId: "tedx", scheduledDate: "2025-07-15", scheduledTime: "15:55", title: "Post-Event Thank You", content: "🙏 Thank you for being part of TEDx Tunis 2025!\n\nWhat an incredible day of ideas, connection, and inspiration.\n\nThe recording of all talks will be available on our YouTube channel within 2 weeks.\n\nFollow @TEDxTunis for the highlight reel and photos.\n\nUntil next year! 💙\n#TEDxTunis2025", type: "update", sent: false },
];

// ─── PM & EWA Tasks ───────────────────────────────────────────────────────────
export type PmTask = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "draft" | "todo" | "in_progress" | "done";
  dueDate?: string;
  /** "all" or a WorkspaceMember id */
  assignedTo: "all" | string;
  assignedToName: string;
  assignedToHue?: number;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
};

export const pmTasks: PmTask[] = [
  { id: "PT-001", workspaceId: "pmewa", title: "Prepare Q3 cross-event budget", description: "Consolidate budget requests from TEDx and MeetupPro, compare with Q2 actuals and submit to treasurer.", priority: "urgent", status: "todo", dueDate: "2025-06-20", assignedTo: "ocp-pmewa", assignedToName: "Fatma Rejeb", assignedToHue: 180, createdBy: "admin-mehdi", createdAt: "2025-06-01", publishedAt: "2025-06-01" },
  { id: "PT-002", workspaceId: "pmewa", title: "Update member onboarding guide", description: "Revise the onboarding handbook to include Nucleus platform instructions and updated RBAC roles.", priority: "medium", status: "in_progress", dueDate: "2025-06-25", assignedTo: "ocp-pmewa", assignedToName: "Fatma Rejeb", assignedToHue: 180, createdBy: "admin-mehdi", createdAt: "2025-06-03", publishedAt: "2025-06-03" },
  { id: "PT-003", workspaceId: "pmewa", title: "Collect KPI reports from all event OCPs", description: "Request monthly KPI snapshot from TEDx OCP and MeetupPro OCP. Deadline end of month.", priority: "high", status: "todo", dueDate: "2025-06-30", assignedTo: "all", assignedToName: "All Members", createdBy: "admin-rayen", createdAt: "2025-06-05", publishedAt: "2025-06-05" },
  { id: "PT-004", workspaceId: "pmewa", title: "Draft inter-workspace SLA document", description: "Define service-level agreements between PM dept and event workspaces regarding response times and deliverables.", priority: "low", status: "draft", dueDate: "2025-07-10", assignedTo: "ocp-pmewa", assignedToName: "Fatma Rejeb", assignedToHue: 180, createdBy: "admin-mehdi", createdAt: "2025-06-08" },
  { id: "PT-005", workspaceId: "pmewa", title: "Coordinate venue contracts review", description: "Review venue contracts for TEDx July event and MeetupPro June event. Flag any clauses with legal.", priority: "high", status: "done", dueDate: "2025-06-10", assignedTo: "ocp-pmewa", assignedToName: "Fatma Rejeb", assignedToHue: 180, createdBy: "admin-amine", createdAt: "2025-05-28", publishedAt: "2025-05-28" },
];

// ─── Activity Log ─────────────────────────────────────────────────────────────
export type ActivityEntry = {
  id: string;
  workspaceId: string;
  areaId?: string;
  who: string;
  whoHue: number;
  action: string;
  target: string;
  timestamp: string;
  type: "task" | "lead" | "member" | "system" | "file";
  tone: string;
};

export const activityLog: ActivityEntry[] = [];

// ─── Public Relations People ─────────────────────────────────────────────────
import type { PRPerson, LogisticsItem } from "../types";

export const prPeople: PRPerson[] = [
  // Speakers - TEDx
  { id: "PR-001", workspaceId: "tedx", type: "speaker", name: "Dr. Aisha Kamara", organization: "Future Lab Institute", email: "aisha@futurelab.org", phone: "+216 55 100 001", topic: "The Future of Human Connection", stage: "confirmed", stageNotes: { contact: "Reached via email", contacted: "Very positive, agreed to speak", negotiation: "Discussed honorarium and travel" }, confirmedDate: "2025-07-15", confirmedTime: "09:15", updatedAt: "2d ago" },
  { id: "PR-002", workspaceId: "tedx", type: "speaker", name: "Yann Moreau", organization: "OpenMind AI", email: "yann@openmind.ai", phone: "+216 55 100 002", topic: "AI and Creativity", stage: "confirmed", stageNotes: { contact: "LinkedIn outreach", contacted: "Agreed quickly", negotiation: "Remote only, needs good AV" }, confirmedDate: "2025-07-15", confirmedTime: "09:40", updatedAt: "3d ago" },
  { id: "PR-003", workspaceId: "tedx", type: "speaker", name: "Lena Fischer", organization: "Green Cities Collective", email: "lena@greencities.de", phone: "+49 30 555 1234", topic: "Sustainable Cities", stage: "negotiation", stageNotes: { contact: "Referral from OCP", contacted: "Interested, wants agenda" }, updatedAt: "1d ago" },
  { id: "PR-004", workspaceId: "tedx", type: "speaker", name: "Nadia Benyoucef", organization: "Unlearn.io", email: "nadia@unlearn.io", phone: "+216 55 100 004", topic: "The Art of Unlearning", stage: "confirmed", stageNotes: { contact: "Cold email", contacted: "Enthusiastic", negotiation: "Pro-bono, wants visibility" }, confirmedDate: "2025-07-15", confirmedTime: "14:30", updatedAt: "4d ago" },
  { id: "PR-005", workspaceId: "tedx", type: "speaker", name: "Omar Khalil", organization: "Trust Observatory", email: "omar@trust-obs.org", phone: "+216 55 100 005", topic: "Rebuilding Trust in Institutions", stage: "contacted", stageNotes: { contact: "Via event manager", contacted: "Warm response, will confirm soon" }, updatedAt: "5h ago" },
  { id: "PR-006", workspaceId: "tedx", type: "speaker", name: "Rami Cherif", organization: "Independent", email: "rami.cherif@gmail.com", phone: "+216 20 600 600", topic: "Youth and Tech", stage: "contact", stageNotes: {}, updatedAt: "1h ago" },
  // Media - TEDx
  { id: "PR-007", workspaceId: "tedx", type: "media", name: "El Bilad TV", organization: "El Bilad Media Group", email: "press@bilad.tv", phone: "+216 71 900 001", mediaType: "TV", stage: "negotiation", stageNotes: { contact: "Outreach to press department", contacted: "Positive, want exclusivity for opening" }, updatedAt: "1h ago" },
  { id: "PR-008", workspaceId: "tedx", type: "media", name: "Mosaique FM", organization: "Mosaique Radio", email: "events@mosaique.fm", phone: "+216 71 900 002", mediaType: "Radio", stage: "confirmed", stageNotes: { contact: "Existing relationship", contacted: "Immediate yes", negotiation: "2 spots on morning show" }, confirmedDate: "2025-07-15", confirmedTime: "08:00", updatedAt: "2d ago" },
  { id: "PR-009", workspaceId: "tedx", type: "media", name: "La Presse", organization: "La Presse de Tunisie", email: "culture@lapresse.tn", phone: "+216 71 900 003", mediaType: "Press", stage: "contacted", stageNotes: { contact: "Press kit sent", contacted: "Will cover if confirmed agenda" }, updatedAt: "6h ago" },
  { id: "PR-010", workspaceId: "tedx", type: "media", name: "Tunisie Numérique", organization: "TN Online", email: "redac@tunisienumerique.com", phone: "+216 71 900 004", mediaType: "Online", stage: "contact", stageNotes: {}, updatedAt: "30m ago" },
  // Speakers - MeetupPro
  { id: "PR-011", workspaceId: "meetup", type: "speaker", name: "Sami Letaief", organization: "DevCircle Tunisia", email: "sami@devcircle.tn", phone: "+216 55 200 001", topic: "Building Dev Communities", stage: "confirmed", stageNotes: { contact: "Community contact", contacted: "Very keen", negotiation: "No fee, just exposure" }, confirmedDate: "2025-06-28", confirmedTime: "19:00", updatedAt: "1d ago" },
  { id: "PR-012", workspaceId: "meetup", type: "speaker", name: "Amira Bouaziz", organization: "Fablab Sousse", email: "amira@fablab.tn", phone: "+216 55 200 002", topic: "Making and Innovation", stage: "negotiation", stageNotes: { contact: "LinkedIn", contacted: "Open to speaking" }, updatedAt: "2h ago" },
  // Media - MeetupPro
  { id: "PR-013", workspaceId: "meetup", type: "media", name: "Startup Tunisia", organization: "StartupTN", email: "media@startup.tn", phone: "+216 71 800 001", mediaType: "Online", stage: "confirmed", stageNotes: { contact: "Email blast", contacted: "Confirmed coverage", negotiation: "Will live tweet and article" }, confirmedDate: "2025-06-28", confirmedTime: "18:00", updatedAt: "3d ago" },
];

// ─── Logistics Items ─────────────────────────────────────────────────────────

export const logisticsItems: LogisticsItem[] = [
  { id: "LG-001", workspaceId: "tedx", keyAreaId: "logistics", company: "Palais des Congrès", contact: "Faten Mansouri", email: "faten@palais.tn", phone: "+216 71 340 001", itemType: "Chairs", quantity: 800, unit: "units", notes: "Main auditorium seating — padded conference chairs.", stage: "confirmed", assigneeName: "Youssef Ben Amor", assigneeHue: 30, validated: true, pendingValidation: false, updatedAt: "2d ago", tags: ["Venue"] },
  { id: "LG-002", workspaceId: "tedx", keyAreaId: "logistics", company: "SoundPro Tunisie", contact: "Raouf Bel Haj", email: "raouf@soundpro.tn", phone: "+216 55 340 002", itemType: "PA Sound System", quantity: 1, unit: "set", notes: "Full PA for 800-seat hall. Includes monitors and FOH desk.", stage: "confirmed", assigneeName: "Youssef Ben Amor", assigneeHue: 30, validated: true, pendingValidation: false, updatedAt: "3d ago", tags: ["AV"] },
  { id: "LG-003", workspaceId: "tedx", keyAreaId: "logistics", company: "LED Screens TN", contact: "Mariem Grati", email: "mariem@ledscreens.tn", phone: "+216 55 340 003", itemType: "LED Walls", quantity: 2, unit: "panels (6x3m)", notes: "Side stage LED walls for speaker slides.", stage: "negotiation", assigneeName: "Youssef Ben Amor", assigneeHue: 30, validated: true, pendingValidation: false, updatedAt: "1d ago", tags: ["AV"] },
  { id: "LG-004", workspaceId: "tedx", keyAreaId: "logistics", company: "Décor & Co", contact: "Hatem Zouabi", email: "hatem@decorco.tn", phone: "+216 55 340 004", itemType: "Stage Backdrop Banner", quantity: 3, unit: "units (5x3m)", notes: "TEDx branded backdrops for main stage and networking zone.", stage: "contacted", validated: true, pendingValidation: false, updatedAt: "6h ago", tags: ["Branding"] },
  { id: "LG-005", workspaceId: "tedx", keyAreaId: "logistics", company: "Badge Express", contact: "Saoussen Brik", email: "contact@badge-express.tn", phone: "+216 55 340 005", itemType: "Printed Badges", quantity: 600, unit: "units", notes: "Attendee + VIP + staff badges with lanyards.", stage: "new", assigneeId: "oc-tedx-logistics", validated: false, pendingValidation: true, updatedAt: "2h ago", tags: ["Print"] },
  { id: "LG-006", workspaceId: "tedx", keyAreaId: "logistics", company: "Tables & Chairs Pro", contact: "Walid Triki", email: "walid@tcp.tn", phone: "+216 55 340 006", itemType: "Round Tables", quantity: 20, unit: "units", notes: "Networking zone round tables for sponsor booths.", stage: "negotiation", validated: true, pendingValidation: false, updatedAt: "4h ago", tags: ["Furniture"] },
  { id: "LG-007", workspaceId: "meetup", keyAreaId: "logistics", company: "Hub 51", contact: "Ghassen Fakhfakh", email: "events@hub51.tn", phone: "+216 71 510 051", itemType: "Event Space", quantity: 1, unit: "venue (100 pax)", notes: "Full venue rental with projector and WiFi.", stage: "confirmed", validated: true, pendingValidation: false, updatedAt: "2d ago", tags: ["Venue"] },
  { id: "LG-008", workspaceId: "meetup", keyAreaId: "logistics", company: "AV Rent TN", contact: "Slim Karray", email: "slim@avrent.tn", phone: "+216 55 510 008", itemType: "Projector + Screen", quantity: 1, unit: "set", notes: "4K projector with 3m screen for main presentation.", stage: "confirmed", validated: true, pendingValidation: false, updatedAt: "1d ago", tags: ["AV"] },
];
