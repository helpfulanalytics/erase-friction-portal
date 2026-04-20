/** Structural type compatible with both firebase/firestore and firebase-admin/firestore Timestamps. */
export interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
  isEqual(other: Timestamp): boolean;
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "CLIENT" | "DEV";

export interface User {
  email:     string;
  name:      string;
  role:      UserRole;
  company:   string;
  avatar:    string;
  createdAt: Timestamp;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface Project {
  name:        string;
  description: string;
  status:      ProjectStatus;
  createdAt:   Timestamp;
}

// ─── Project Member ──────────────────────────────────────────────────────────

export interface ProjectMember {
  userId:    string;
  projectId: string;
}

// ─── Invite ──────────────────────────────────────────────────────────────────

export interface Invite {
  email:      string;
  name:       string;
  company:    string;
  projectIds: string[];
  role:       UserRole;
  token:      string;
  expiresAt:  Timestamp;
  accepted:   boolean;
  createdAt:  Timestamp;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface SessionPayload {
  uid:   string;
  email: string;
  role:  UserRole;
}

export interface InviteTokenPayload {
  inviteId: string;
  email:    string;
}

export interface MagicLinkTokenPayload {
  email: string;
}

// ─── Collection path constants ───────────────────────────────────────────────

export const COLLECTIONS = {
  users:          "users",
  projects:       "projects",
  projectMembers: "projectMembers",
  invites:        "invites",
} as const;

// ─── Documents ────────────────────────────────────────────────────────────────

export type DocumentType = "INTERNAL" | "CLIENT_VISIBLE" | "BRIEF" | "PROPOSAL" | "MEETING_NOTES";
export type DocumentStatus = "DRAFT" | "REVIEW" | "APPROVED";

export interface Document {
  projectId:  string;
  title:      string;
  content:    unknown; // Plate/Slate JSON
  type:       DocumentType;
  status:     DocumentStatus;
  version:    number;
  createdAt:  Timestamp;
  updatedAt:  Timestamp;
}

export interface DocVersion {
  documentId: string;
  content:    unknown;
  version:    number;
  createdAt:  Timestamp;
}

export interface DocComment {
  documentId: string;
  userId:     string;
  body:       string;
  resolved:   boolean;
  createdAt:  Timestamp;
}

export interface Signature {
  documentId:     string;
  userId:         string;
  signedAt:       Timestamp;
  signatureData:  string; // base64
  ipAddress:      string;
}
