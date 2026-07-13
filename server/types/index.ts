export interface User { id: string; companyName: string; email: string; passwordHash: string; role: 'admin' | 'user'; createdAt: string; }
export interface Workflow { id: string; userId: string; name: string; nodes: any[]; edges: any[]; updatedAt: string; }
export interface CallLog { id: string; userId: string; patientName: string; duration: string; status: 'Concluído' | 'Falhou'; time: string; agent: string; timestamp: string; }
export interface DatabaseSchema { users: User[]; workflows: Workflow[]; callLogs: CallLog[]; brandColors: Record<string, string>; checklist: Record<string, Record<string, boolean>>; auditLogs: any[]; settings: Record<string, any>; metrics: any[]; sessions: any[]; }
