// ============================================================
// Collaboration & Shared Library Types
// ============================================================

import type { ID, Timestamp, EmailBlock, EmailGlobalStyles } from './index';

// ---- User & Auth Types (maps to cmpmarketinghub auth) ----

export interface AppUser {
  id: ID;
  username: string;
  role: 'admin' | 'user';
  properties: ID[]; // property IDs user has access to
  displayName?: string;
  avatarUrl?: string;
}

// ---- Shared Email Library ----

export type SharedEmailVisibility = 'private' | 'property' | 'public';

export interface SharedEmail {
  id: ID;
  projectId: ID;
  name: string;
  description?: string;
  propertyId: ID;
  propertyName: string;
  sharedBy: string; // username
  sharedAt: Timestamp;
  updatedAt: Timestamp;
  visibility: SharedEmailVisibility;
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
  htmlSnapshot: string;
  subjectLine?: string;
  previewText?: string;
  tags: string[];
  usageCount: number; // how many times others have used/duplicated it
}

// ---- Collaborative Editing ----

export type CollaboratorPresenceStatus = 'active' | 'idle' | 'away';

export interface Collaborator {
  userId: ID;
  username: string;
  displayName: string;
  avatarUrl?: string;
  color: string; // cursor/selection color
  presenceStatus: CollaboratorPresenceStatus;
  selectedBlockId: ID | null;
  lastActiveAt: Timestamp;
}

export interface CollaborationSession {
  id: ID;
  projectId: ID;
  createdBy: string;
  createdAt: Timestamp;
  isActive: boolean;
  collaborators: Collaborator[];
  inviteLink?: string;
}

/** Events sent over the real-time channel */
export type CollabEventType =
  | 'block-added'
  | 'block-removed'
  | 'block-updated'
  | 'block-moved'
  | 'blocks-reordered'
  | 'global-styles-updated'
  | 'cursor-moved'
  | 'selection-changed'
  | 'collaborator-joined'
  | 'collaborator-left'
  | 'collaborator-presence';

export interface CollabEvent {
  type: CollabEventType;
  userId: ID;
  username: string;
  timestamp: Timestamp;
  payload: Record<string, unknown>;
}

// ---- Service Interfaces ----

export interface ISharedEmailService {
  getByProperty(propertyId: ID): Promise<SharedEmail[]>;
  getMyShared(username: string): Promise<SharedEmail[]>;
  getPublic(): Promise<SharedEmail[]>;
  getById(id: ID): Promise<SharedEmail | undefined>;
  share(email: SharedEmail): Promise<SharedEmail>;
  unshare(id: ID): Promise<void>;
  updateVisibility(id: ID, visibility: SharedEmailVisibility): Promise<SharedEmail>;
  duplicate(id: ID, newName: string, username: string): Promise<SharedEmail>;
}

export interface ICollaborationService {
  createSession(projectId: ID, username: string): Promise<CollaborationSession>;
  joinSession(sessionId: ID, user: Collaborator): Promise<CollaborationSession>;
  leaveSession(sessionId: ID, userId: ID): Promise<void>;
  getSession(projectId: ID): Promise<CollaborationSession | null>;
  sendEvent(sessionId: ID, event: CollabEvent): Promise<void>;
  onEvent(sessionId: ID, callback: (event: CollabEvent) => void): () => void; // returns unsubscribe
}
