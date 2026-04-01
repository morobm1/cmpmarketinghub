import type { ID } from '@/types';
import type {
  CollaborationSession,
  Collaborator,
  CollabEvent,
  ICollaborationService,
} from '@/types/collaboration';

/**
 * Collaboration Service - abstraction for real-time co-editing.
 * 
 * Mock implementation stores sessions in memory.
 * Production implementation should use WebSocket or SSE
 * connected to the cmpmarketinghub backend.
 * 
 * Integration plan:
 * - Backend: Add a Netlify function or separate WebSocket server
 *   for real-time collaboration events
 * - Use MongoDB Change Streams or a pub/sub system for event distribution
 * - Frontend: Replace mock with WebSocket client
 */
class MockCollaborationService implements ICollaborationService {
  private sessions: Map<string, CollaborationSession> = new Map();
  private listeners: Map<string, Set<(event: CollabEvent) => void>> = new Map();

  async createSession(projectId: ID, username: string): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: 'collab-' + Date.now(),
      projectId,
      createdBy: username,
      createdAt: new Date().toISOString(),
      isActive: true,
      collaborators: [],
      inviteLink: 'https://app.example.com/collab/' + projectId,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async joinSession(sessionId: ID, user: Collaborator): Promise<CollaborationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    // Remove existing entry for this user if re-joining
    session.collaborators = session.collaborators.filter((c) => c.userId !== user.userId);
    session.collaborators.push(user);

    // Notify others
    this.emit(sessionId, {
      type: 'collaborator-joined',
      userId: user.userId,
      username: user.username,
      timestamp: new Date().toISOString(),
      payload: { collaborator: user },
    });

    return session;
  }

  async leaveSession(sessionId: ID, userId: ID): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const leaving = session.collaborators.find((c) => c.userId === userId);
    session.collaborators = session.collaborators.filter((c) => c.userId !== userId);

    if (leaving) {
      this.emit(sessionId, {
        type: 'collaborator-left',
        userId,
        username: leaving.username,
        timestamp: new Date().toISOString(),
        payload: {},
      });
    }

    // Clean up empty sessions
    if (session.collaborators.length === 0) {
      session.isActive = false;
    }
  }

  async getSession(projectId: ID): Promise<CollaborationSession | null> {
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  async sendEvent(sessionId: ID, event: CollabEvent): Promise<void> {
    this.emit(sessionId, event);
  }

  onEvent(sessionId: ID, callback: (event: CollabEvent) => void): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(sessionId)?.delete(callback);
    };
  }

  private emit(sessionId: string, event: CollabEvent) {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.forEach((cb) => cb(event));
    }
  }
}

export const collaborationService: ICollaborationService = new MockCollaborationService();
