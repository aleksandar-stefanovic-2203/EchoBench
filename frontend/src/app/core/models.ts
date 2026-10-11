export interface Option { id: string; label: string }
export type Question = { id: string; label: string; required: boolean } & ({ type: 'text' } | { type: 'checkbox' | 'multiple_choice'; options: Option[] });
export interface Answer { questionId: string; value: string | string[] }
export interface Organizer { id: string; username: string; email: string }
export interface Survey { id: string; title: string; description: string; questions: Question[]; status: 'draft' | 'published'; shareUrl: string | null; createdAt: string; updatedAt: string; publishedAt: string | null; responseCount: number }
export type SurveyListItem = Pick<Survey, 'id' | 'title' | 'status' | 'responseCount' | 'createdAt' | 'publishedAt'>;
export interface Submission { id: string; submittedAt: string; answers: Answer[] }
export interface Finding { text: string; sourceIds: string[] }
export interface EvidenceSource { sourceId: string; surveyId: string; surveyTitle: string; submissionId: string; questionId: string; responseNumber: number; questionNumber: number; question: string; value: string | string[] }
export interface CriterionScore { score: number | null; responseCount: number }
export interface QuestionAnalytics { questionId: string; label: string; type: string; responseCount: number; answeredCount: number; unansweredCount: number; completionPercent: number; options: {label: string; count: number; percent: number}[] }
export interface SurveySummary {
  surveyId: string; responseCount: number; generatedAt: string; model: string; overview: string;
  themes: Finding[]; positiveHighlights: Finding[]; improvements: Finding[]; suggestedActions: Finding[];
  sources: EvidenceSource[]; analytics: QuestionAnalytics[]; snapshotSurveys: {id: string; title: string; responseCount: number}[];
  comparison: { method: string; criteria: {id: string; label: string; description: string; target: CriterionScore; others: CriterionScore; difference: number | null}[]; events: {id: string; title: string; responseCount: number; criteria: (CriterionScore & {id: string})[]}[] };
}
export interface PublicSurvey { title: string; description: string; questions: Question[]; requiresEmail: true }
export interface Failure { message: string; fields: Record<string, string> }
export function failure(error: any): Failure {
  return { message: error?.error?.error?.message ?? 'Server nije dostupan. Pokušajte ponovo; vaš unos je sačuvan u ovoj formi.', fields: error?.error?.error?.fields ?? {} };
}
