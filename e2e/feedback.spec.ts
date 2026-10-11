import { test, expect, type Page } from '@playwright/test';
async function register(page:Page,suffix:string) {
  await page.goto('/register'); await page.getByLabel('Username').fill(`org-${suffix}`); await page.getByLabel('Email',{exact:true}).fill(`${suffix}@example.com`); await page.getByLabel('Password',{exact:true}).fill('demo123'); await page.getByLabel('Confirm password').fill('demo123'); await page.getByRole('button',{name:'Sign up'}).click(); await expect(page.getByRole('heading',{name:'My surveys'})).toBeVisible();
}
test('organizer → draft → public mobile form → three responses → owner/privacy/logout', async({page,browser})=>{
  const browserErrors:string[]=[];page.on('pageerror',e=>browserErrors.push(e.message));
  await register(page,crypto.randomUUID()); await expect(page.getByText('Your first survey starts here.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page).toHaveTitle('EventBench — event feedback');
  await expect(page.locator('a.brand')).toContainText('EventBench');
  await page.getByRole('link',{name:'+ New survey',exact:true}).click(); await page.getByLabel('Survey title').fill('Hackathon feedback'); await page.getByLabel('Description').fill('Share your feedback.');
  await page.getByLabel('Question text').fill('What was the best part?'); await page.getByLabel('Required question').check();
  await page.getByRole('button',{name:'+ Checkbox question',exact:true}).click(); await page.getByLabel('Question text').nth(1).fill('What did you use?'); await page.getByLabel('Required question').nth(1).check(); await page.getByLabel('Option 1',{exact:true}).fill('Mentors'); await page.getByLabel('Option 2',{exact:true}).fill('Workshops');
  await page.getByRole('button',{name:'+ Text question',exact:true}).click(); await page.getByLabel('Question text').nth(2).fill('What should we change next time?');
  await page.getByRole('button',{name:'Save draft',exact:true}).click(); await expect(page.getByText('Draft saved.',{exact:false})).toBeVisible(); await page.reload(); await expect(page.getByLabel('Survey title')).toHaveValue('Hackathon feedback');
  await page.getByRole('button',{name:'Generate link',exact:true}).click(); await expect(page.getByLabel('Public link')).toBeVisible(); const shareUrl=await page.getByLabel('Public link').inputValue(); const privateUrl=page.url();
  await expect(page.getByRole('button',{name:'Summarize',exact:true})).toBeDisabled();
  const ctx=await browser.newContext({viewport:{width:360,height:780}}); const guest=await ctx.newPage(); await guest.goto(shareUrl); await expect(guest.getByText('No login required. Your email is collected but is not shown to the organizer.')).toBeVisible();
  expect(await guest.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await guest.getByRole('button',{name:'Submit feedback',exact:true}).click(); await expect(guest.getByRole('heading',{name:'Thanks for your feedback!'})).not.toBeVisible();
  await guest.getByLabel('Your email').fill('guest@example.com'); await guest.getByLabel('1. What was the best part?').fill('The mentors were excellent.'); await guest.getByLabel('3. What should we change next time?').fill('The room was cold.'); await guest.getByLabel('Mentors',{exact:true}).check(); await guest.getByLabel('Workshops',{exact:true}).check();
  await guest.getByLabel('Your email').focus(); await guest.keyboard.press('Tab'); await expect(guest.getByLabel('1. What was the best part?')).toBeFocused();
  // Simulate an ambiguous network failure AFTER the server commits: same retry key must return 200.
  const sent: unknown[]=[]; let first=true;
  await guest.route('**/api/public/surveys/*/responses',async route=>{sent.push(route.request().postDataJSON()); if(first){first=false; await route.fetch(); await route.abort('failed');}else await route.continue();});
  await guest.getByRole('button',{name:'Submit feedback',exact:true}).click(); await expect(guest.getByRole('alert')).toBeVisible(); await expect(guest.getByLabel('1. What was the best part?')).toHaveValue('The mentors were excellent.');
  await guest.getByRole('button',{name:'Submit feedback',exact:true}).click(); await expect(guest.getByRole('heading',{name:'Thanks for your feedback!'})).toBeVisible(); expect(sent[1]).toEqual(sent[0]); await guest.unrouteAll();
  for(let i=0;i<2;i++){await guest.getByRole('button',{name:'Submit another response'}).click();await guest.getByLabel('Your email').fill('guest@example.com');await guest.getByLabel('1. What was the best part?').fill(`Response ${i+2}`);await guest.getByLabel('Mentors',{exact:true}).check();await guest.getByRole('button',{name:'Submit feedback',exact:true}).click();await expect(guest.getByRole('heading',{name:'Thanks for your feedback!'})).toBeVisible();}
  await page.getByRole('button',{name:'Refresh responses'}).click(); await expect(page.getByRole('heading',{name:'Responses · 3',exact:true})).toBeVisible(); await page.locator('summary').last().click(); await expect(page.getByText('Mentors, Workshops',{exact:true})).toBeVisible(); await expect(page.getByText('guest@example.com')).not.toBeVisible();
  let summaryCalls=0;
  const ownerToken=await page.evaluate(()=>sessionStorage.getItem('eventbench.session')!);
  const otherSurvey=await page.request.post('/api/surveys',{headers:{Authorization:`Bearer ${ownerToken}`},data:{title:'Another seminar',description:'',questions:[{id:crypto.randomUUID(),type:'text',label:'Feedback',required:true}]}});
  expect(otherSurvey.status()).toBe(201);const otherId=(await otherSurvey.json()).survey.id;
  await page.route('**/api/surveys/*/summary',async route=>{
    summaryCalls++;
    expect(route.request().method()).toBe('POST'); expect(route.request().postDataJSON()).toEqual({});
    if(summaryCalls===1) {await route.fulfill({status:503,json:{error:{code:'SUMMARY_UNAVAILABLE',message:'The Gemma API is unavailable. Try again.'}}});return;}
    await new Promise(resolve=>setTimeout(resolve,250));
    const eventId=privateUrl.split('/').at(-1)!;
    const sources=[{sourceId:'S1',surveyId:eventId,surveyTitle:'Hackathon feedback',submissionId:'response1',questionId:'question1',responseNumber:1,questionNumber:1,question:'What was the best part?',value:'The mentors were excellent.'},{sourceId:'S2',surveyId:eventId,surveyTitle:'Hackathon feedback',submissionId:'response1',questionId:'question3',responseNumber:1,questionNumber:3,question:'What should we change next time?',value:'The room was cold.'}];
    await route.fulfill({json:{summary:{surveyId:eventId,responseCount:3,generatedAt:new Date().toISOString(),model:'gemma-test',overview:'Attendees praise the mentors.',themes:[{text:'Mentoring',sourceIds:['S1']}],positiveHighlights:[{text:'Excellent mentors',sourceIds:['S1']}],improvements:[{text:'The temperature was low',sourceIds:['S2']}],suggestedActions:[],sources,snapshotSurveys:[{id:eventId,title:'Hackathon feedback',responseCount:3}],comparison:{method:'AI assessment, not a satisfaction percentage.',criteria:[{id:'venue',label:'Venue and conditions',description:'Temperature and equipment',target:{score:0,responseCount:1},others:{score:100,responseCount:2},difference:-100}],events:[{id:otherId,title:'Another seminar',responseCount:2,criteria:[{id:'venue',score:100,responseCount:2}]}]},analytics:[{questionId:'checkbox',label:'What did you use?',type:'checkbox',responseCount:3,answeredCount:3,unansweredCount:0,completionPercent:100,options:[{label:'Mentors',count:3,percent:100},{label:'Workshops',count:1,percent:33.3}]}]}}});
  });
  await page.getByRole('button',{name:'Summarize',exact:true}).click();await expect(page.getByRole('alert')).toContainText('The Gemma API is unavailable');
  await page.getByRole('button',{name:'Summarize',exact:true}).click();await expect(page.getByRole('button',{name:'Summarizing…',exact:true})).toBeDisabled();
  await expect(page.getByRole('heading',{name:'AI summary',exact:true})).toBeVisible();await expect(page.getByText('Attendees praise the mentors.',{exact:true})).toBeVisible();expect(summaryCalls).toBe(2);
  await page.getByText('The temperature was low',{exact:false}).click();await expect(page.locator('.evidence').getByText('The room was cold.',{exact:true})).toBeVisible();await expect(page.locator('.evidence').getByText('Hackathon feedback · Response 1 · Question 3')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Comparison with other events'})).toBeVisible();await expect(page.getByText('-100 points',{exact:true})).toBeVisible();await expect(page.getByRole('progressbar',{name:'What did you use?: Workshops'})).toHaveAttribute('aria-valuenow','33.3');
  await page.setViewportSize({width:360,height:780});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/summary-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:800});
  await guest.getByRole('button',{name:'Submit another response'}).click();await guest.getByLabel('Your email').fill('guest@example.com');await guest.getByLabel('1. What was the best part?').fill('New feedback');await guest.getByLabel('Mentors',{exact:true}).check();await guest.getByRole('button',{name:'Submit feedback',exact:true}).click();
  await page.getByRole('button',{name:'Refresh responses'}).click();await expect(page.getByText('New responses have arrived. Click “Summarize” for an updated summary.')).toBeVisible();
  await page.screenshot({path:'test-results/organizer-detail.png',fullPage:true});
  await page.getByText('Individual event scores',{exact:true}).click();await page.getByRole('link',{name:'Another seminar',exact:true}).click();await expect(page.getByRole('heading',{name:'Another seminar',exact:true})).toBeVisible();await page.goto(privateUrl);await expect(page.getByRole('heading',{name:'Hackathon feedback',exact:true})).toBeVisible();
  await guest.getByRole('button',{name:'Submit another response'}).click();await guest.screenshot({path:'test-results/public-mobile.png',fullPage:true});
  const other=await browser.newContext();const b=await other.newPage();await register(b,crypto.randomUUID());await b.goto(privateUrl);await expect(b.getByRole('alert')).toContainText('Survey unavailable');
  await page.getByRole('button',{name:'Log out'}).click();await page.goto(privateUrl);await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();expect(browserErrors).toEqual([]);await ctx.close();await other.close();
});

test('invalid link, login errors and editor validation are visible without losing input',async({page})=>{
  await page.goto('/s/invalid');await expect(page.getByRole('heading',{name:'Survey unavailable'})).toBeVisible();
  const suffix=crypto.randomUUID();await register(page,suffix);await page.getByRole('button',{name:'Log out'}).click();await page.getByLabel('Email',{exact:true}).fill(`${suffix}@example.com`);await page.getByLabel('Password',{exact:true}).fill('wrong123');await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Invalid email or password.');await expect(page.getByLabel('Email',{exact:true})).toHaveValue(`${suffix}@example.com`);
  await page.getByLabel('Password',{exact:true}).fill('demo123');await page.getByRole('button',{name:'Log in',exact:true}).click();await page.getByRole('link',{name:'+ New survey',exact:true}).click();await page.getByRole('button',{name:'Generate link',exact:true}).click();await expect(page.getByText('Enter a title (1–120 characters).')).toBeVisible();
  await page.getByLabel('Survey title').fill('Option validation');await page.getByLabel('Question text').fill('Question');await page.getByRole('button',{name:'+ Checkbox question',exact:true}).click();await page.getByLabel('Question text').nth(1).fill('Choice');await page.getByLabel('Option 1',{exact:true}).fill('Same');await page.getByLabel('Option 2',{exact:true}).fill(' same ');await page.getByRole('button',{name:'Generate link',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Options must have distinct labels.');await expect(page.getByLabel('Survey title')).toHaveValue('Option validation');
});

test('demo volume opens 10 surveys and 200 responses within two seconds',async({page})=>{
  test.setTimeout(120000);
  await register(page,crypto.randomUUID());const token=await page.evaluate(()=>sessionStorage.getItem('eventbench.session')!);const headers={Authorization:`Bearer ${token}`};let id='';
  for(let i=0;i<10;i++) {
    const qid=crypto.randomUUID();const created=await page.request.post('/api/surveys',{headers,data:{title:`Demo ${i+1}`,description:'',questions:[{id:qid,type:'text',label:'Feedback',required:true}]}});expect(created.status()).toBe(201);id=(await created.json()).survey.id;
    const published=await page.request.post(`/api/surveys/${id}/publish`,{headers});const publicToken=(await published.json()).survey.shareUrl.split('/').at(-1);
    for(let j=0;j<200;j+=20) {const submissions=await Promise.all(Array.from({length:20},(_,k)=>page.request.post(`/api/public/surveys/${publicToken}/responses`,{data:{clientRequestId:crypto.randomUUID(),respondentEmail:'demo@example.com',answers:[{questionId:qid,value:`Feedback ${j+k+1}`}]}})));expect(submissions.every(r=>r.status()===201)).toBe(true);}
  }
  let start=Date.now();await page.goto('/surveys');await expect(page.locator('.survey-grid .card')).toHaveCount(10);const listMs=Date.now()-start;
  start=Date.now();await page.goto(`/surveys/${id}`);await expect(page.locator('details')).toHaveCount(200);const detailMs=Date.now()-start;
  console.log(`Browser navigation + render: list ${listMs} ms, detail ${detailMs} ms (10 × 200).`);expect(listMs).toBeLessThan(2000);expect(detailMs).toBeLessThan(2000);
});
