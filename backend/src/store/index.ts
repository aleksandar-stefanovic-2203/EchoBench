import type { Organizer, Session, Survey, Submission, Contact } from '../types/index.js';
export function createStore() {
  return {
    organizersById: new Map<string, Organizer>(), organizerIdByEmail: new Map<string, string>(), organizerIdByUsername: new Map<string, string>(),
    sessionsByToken: new Map<string, Session>(), surveysById: new Map<string, Survey>(), surveyIdByPublicToken: new Map<string, string>(),
    submissionsBySurveyId: new Map<string, Submission[]>(), contactsBySubmissionId: new Map<string, Contact>(), submissionIdByRequestKey: new Map<string, string>(),
  };
}
export type Store = ReturnType<typeof createStore>;
