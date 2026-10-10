export interface Option { id: string; label: string }
export type Question = { id: string; label: string; required: boolean } & ({ type: 'text' } | { type: 'checkbox' | 'multiple_choice'; options: Option[] });
export interface Answer { questionId: string; value: string | string[] }
export interface Organizer { id: string; username: string; email: string }
export interface Survey { id: string; title: string; description: string; questions: Question[]; status: 'draft' | 'published'; shareUrl: string | null; createdAt: string; updatedAt: string; publishedAt: string | null; responseCount: number }
export type SurveyListItem = Pick<Survey, 'id' | 'title' | 'status' | 'responseCount' | 'createdAt' | 'publishedAt'>;
export interface Submission { id: string; submittedAt: string; answers: Answer[] }
export interface SurveySummary { surveyId: string; responseCount: number; generatedAt: string; model: string; overview: string; themes: string[]; positiveHighlights: string[]; improvements: string[]; suggestedActions: string[] }
export interface PublicSurvey { title: string; description: string; questions: Question[]; requiresEmail: true }
export interface Failure { message: string; fields: Record<string, string> }
export function failure(error: any): Failure {
  return { message: error?.error?.error?.message ?? 'Server nije dostupan. Pokušajte ponovo; vaš unos je sačuvan u ovoj formi.', fields: error?.error?.error?.fields ?? {} };
}
