export interface Option { id: string; label: string }
export type Question = { id: string; label: string; required: boolean } & ({ type: 'text' } | { type: 'checkbox'; options: Option[] });
export interface Answer { questionId: string; value: string | string[] }
export interface Organizer { id: string; username: string; usernameKey: string; email: string; password: string; createdAt: string }
export interface Session { token: string; organizerId: string; createdAt: string; expiresAt: string }
export interface Survey { id: string; ownerId: string; title: string; description: string; questions: Question[]; status: 'draft' | 'published'; publicToken: string | null; createdAt: string; updatedAt: string; publishedAt: string | null }
export interface Submission { id: string; surveyId: string; clientRequestId: string; answers: Answer[]; submittedAt: string }
export interface Contact { submissionId: string; email: string }
