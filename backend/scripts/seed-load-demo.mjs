import { randomUUID } from 'node:crypto';

const base = process.env.DEMO_API_URL ?? 'http://localhost:3000/api';
const responsesPerSurvey = 20;
const ratings = ['Excellent', 'Good', 'Average', 'Poor', 'Very poor'];
const positivePatterns = [
  'The {topic} was explained clearly, and the examples made it easy to follow.',
  'I especially liked the practical work on {topic}; I could apply it right away.',
  'The speakers were prepared and gave useful answers about {topic}.',
  'The schedule felt balanced, and the session on {topic} was engaging.',
  'Good atmosphere and helpful staff. The {topic} discussion was a highlight.',
  'The materials were useful, especially the examples related to {topic}.',
  'I enjoyed meeting other attendees and exchanging ideas about {topic}.',
  'The event was well organized, and the {topic} session kept my attention.',
  'The hands-on part of {topic} helped connect the ideas to real work.',
  'Clear presentations, friendly presenters, and a useful focus on {topic}.',
];
const improvementPatterns = [
  'I would appreciate more time for questions about {topic}.',
  'A longer break between sessions would make the day more comfortable.',
  'Please share the schedule and preparation materials a little earlier.',
  'More hands-on exercises would help reinforce the section on {topic}.',
  'The sound was difficult to hear from the back of the room.',
  'The session started late; clearer timekeeping would help.',
  'It would be useful to leave more time for discussion with the speakers.',
  'The room was crowded during the practical activity.',
  'A short written recap of the {topic} session would be helpful.',
  'The refreshments ran low toward the end of the event.',
];
const accounts = [
  { theme: 'AI and machine learning', events: [
    'Applied AI Workshop',
    'Responsible AI Forum',
    'Machine Learning in Practice',
    'Generative AI Product Lab',
    'AI for Research Meetup',
    'Building Reliable AI Systems',
    'Prompt Engineering Workshop',
    'AI Evaluation and Testing',
    'Data-Centric AI Forum',
    'The Future of Intelligent Applications',
  ] },
  { theme: 'web development', events: ['Frontend Engineering Meetup', 'Modern Web Performance Day'] },
  { theme: 'data science', events: ['Data Science Summit', 'Practical Analytics Workshop'] },
  { theme: 'product design', events: ['Product Discovery Lab', 'UX Research Meetup'] },
  { theme: 'cloud engineering', events: ['Cloud Native Day', 'Platform Engineering Forum'] },
  { theme: 'cybersecurity', events: ['Security Awareness Workshop', 'Application Security Meetup'] },
  { theme: 'entrepreneurship', events: ['Startup Founders Forum', 'Building Early Products'] },
  { theme: 'developer tools', events: ['Developer Experience Summit', 'Open Source Maintainers Meetup'] },
  { theme: 'digital marketing', events: ['Growth Marketing Workshop', 'Content Strategy Forum'] },
  { theme: 'sustainable technology', events: ['Green Software Conference', 'Climate Tech Demo Day'] },
];
const issueOptions = ['Short breaks', 'Not enough practical work', 'Sound or connectivity', 'Schedule changes'];

async function api(path, data, token) {
  const response = await fetch(base + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(`${path}: ${body?.error?.message ?? response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function varied(patterns, index, topic) {
  return `${patterns[index % patterns.length].replaceAll('{topic}', topic)} (${index + 1})`;
}

const seeded = [];
for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
  const account = accounts[accountIndex];
  const credentials = {
    username: `load-demo-${String(accountIndex + 1).padStart(2, '0')}`,
    email: `load-demo-${String(accountIndex + 1).padStart(2, '0')}@echobench.test`,
    password: 'Demo123!',
  };

  let session;
  try {
    session = await api('/auth/login', { email: credentials.email, password: credentials.password });
  } catch (error) {
    if (error.status !== 401) throw error;
    session = await api('/auth/register', credentials);
  }

  const token = session.sessionToken;
  const existing = (await api('/surveys', undefined, token)).items;
  const accountSurveys = [];

  for (let eventIndex = 0; eventIndex < account.events.length; eventIndex++) {
    const title = `Load demo ${String(accountIndex + 1).padStart(2, '0')} · ${account.events[eventIndex]}`;
    const existingSurvey = existing.find(survey => survey.title === title);
    let survey;

    if (existingSurvey) {
      survey = (await api(`/surveys/${existingSurvey.id}`, undefined, token)).survey;
    } else {
      const ratingOptions = ratings.map(label => ({ id: randomUUID(), label }));
      const issues = [...issueOptions].map(label => ({ id: randomUUID(), label }));
      const questions = [
        { id: randomUUID(), type: 'text', label: 'What worked well at this event?', required: true },
        { id: randomUUID(), type: 'text', label: 'What should we improve next time?', required: true },
        { id: randomUUID(), type: 'multiple_choice', label: 'How would you rate the event overall?', required: true, options: ratingOptions },
        { id: randomUUID(), type: 'checkbox', label: 'Which issues did you notice?', required: false, options: issues },
      ];
      survey = (await api('/surveys', {
        title,
        description: `Synthetic feedback dataset about ${account.theme}, created for testing event summaries and comparisons.`,
        questions,
      }, token)).survey;
    }

    if (survey.status !== 'published') {
      survey = (await api(`/surveys/${survey.id}/publish`, {}, token)).survey;
    }

    const responseCount = survey.responseCount ?? 0;
    if (responseCount < responsesPerSurvey) {
      const publicToken = survey.shareUrl.split('/').at(-1);
      const fullSurvey = await api(`/public/surveys/${publicToken}`, undefined);
      const questions = fullSurvey.survey.questions;
      const ratingOptions = questions[2].options;
      const issues = questions[3].options;
      for (let responseIndex = responseCount; responseIndex < responsesPerSurvey; responseIndex++) {
        const globalIndex = accountIndex * 10 + eventIndex;
        const selectedIssues = [responseIndex % issues.length];
        if (responseIndex % 3 === 0) selectedIssues.push((responseIndex + 1) % issues.length);
        await api(`/public/surveys/${publicToken}/responses`, {
          clientRequestId: randomUUID(),
          respondentEmail: `attendee-${String(responseIndex + 1).padStart(2, '0')}@example.test`,
          answers: [
            { questionId: questions[0].id, value: varied(positivePatterns, responseIndex + globalIndex, account.theme) },
            { questionId: questions[1].id, value: varied(improvementPatterns, responseIndex + globalIndex * 3, account.theme) },
            { questionId: questions[2].id, value: ratingOptions[(responseIndex + globalIndex) % ratingOptions.length].id },
            { questionId: questions[3].id, value: selectedIssues.map(index => issues[index].id) },
          ],
        });
      }
    }

    const refreshed = await api(`/surveys/${survey.id}`, undefined, token);
    accountSurveys.push({ id: survey.id, title, responseCount: refreshed.survey.responseCount });
  }

  seeded.push({
    email: credentials.email,
    password: credentials.password,
    surveys: accountSurveys,
  });
}

console.log(JSON.stringify({
  totals: {
    users: seeded.length,
    surveys: seeded.reduce((count, account) => count + account.surveys.length, 0),
    responses: seeded.reduce((count, account) => count + account.surveys.reduce((sum, survey) => sum + survey.responseCount, 0), 0),
  },
  accounts: seeded,
}, null, 2));
