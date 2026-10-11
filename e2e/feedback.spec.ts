import { test, expect, type Page } from '@playwright/test';
async function register(page:Page,suffix:string) {
  await page.goto('/register'); await page.getByLabel('Korisničko ime').fill(`org-${suffix}`); await page.getByLabel('Mejl',{exact:true}).fill(`${suffix}@example.com`); await page.getByLabel('Lozinka',{exact:true}).fill('demo123'); await page.getByLabel('Potvrdite lozinku').fill('demo123'); await page.getByRole('button',{name:'Registruj se'}).click(); await expect(page.getByRole('heading',{name:'Moje ankete'})).toBeVisible();
}
test('organizer → draft → public mobile form → three responses → owner/privacy/logout', async({page,browser})=>{
  test.setTimeout(150000);
  const browserErrors:string[]=[];page.on('pageerror',e=>browserErrors.push(e.message));
  await register(page,crypto.randomUUID()); await expect(page.getByText('Prva anketa počinje ovde.')).toBeVisible();
  await page.getByRole('link',{name:'+ Nova anketa',exact:true}).click(); await page.getByLabel('Naslov ankete').fill('Feedback hakatona'); await page.getByLabel('Opis').fill('Podelite svoje utiske.');
  await page.getByLabel('Tekst pitanja').fill('Šta je bilo najbolje?'); await page.getByLabel('Obavezno pitanje').check();
  await page.getByRole('button',{name:'+ Checkbox pitanje',exact:true}).click(); await page.getByLabel('Tekst pitanja').nth(1).fill('Šta si koristio?'); await page.getByLabel('Obavezno pitanje').nth(1).check(); await page.getByLabel('Opcija 1',{exact:true}).fill('Mentori'); await page.getByLabel('Opcija 2',{exact:true}).fill('Radionice');
  await page.getByRole('button',{name:'+ Tekstualno pitanje',exact:true}).click(); await page.getByLabel('Tekst pitanja').nth(2).fill('Šta menjamo sledeći put?');
  await page.getByRole('button',{name:'Sačuvaj nacrt',exact:true}).click(); await expect(page.getByText('Nacrt je sačuvan.',{exact:false})).toBeVisible(); await page.reload(); await expect(page.getByLabel('Naslov ankete')).toHaveValue('Feedback hakatona');
  await page.getByRole('button',{name:'Generiši link',exact:true}).click(); await expect(page.getByLabel('Javni link')).toBeVisible(); const shareUrl=await page.getByLabel('Javni link').inputValue(); const privateUrl=page.url();
  await expect(page.getByRole('button',{name:'Sumiraj',exact:true})).toBeDisabled();
  const ctx=await browser.newContext({viewport:{width:360,height:780}}); const guest=await ctx.newPage(); await guest.goto(shareUrl); await expect(guest.getByText('Popunjavanje bez prijave; mejl se prikuplja, ali se ne prikazuje organizatoru.')).toBeVisible();
  expect(await guest.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await guest.getByRole('button',{name:'Pošalji feedback',exact:true}).click(); await expect(guest.getByRole('heading',{name:'Hvala na utiscima!'})).not.toBeVisible();
  await guest.getByLabel('Vaš mejl').fill('guest@example.com'); await guest.getByLabel('1. Šta je bilo najbolje?').fill('Mentori su odlični.'); await guest.getByLabel('Mentori',{exact:true}).check(); await guest.getByLabel('Radionice',{exact:true}).check();
  await guest.getByLabel('Vaš mejl').focus(); await guest.keyboard.press('Tab'); await expect(guest.getByLabel('1. Šta je bilo najbolje?')).toBeFocused(); await guest.waitForTimeout(30000);
  // Simulate an ambiguous network failure AFTER the server commits: same retry key must return 200.
  const sent: unknown[]=[]; let first=true;
  await guest.route('**/api/public/surveys/*/responses',async route=>{sent.push(route.request().postDataJSON()); if(first){first=false; await route.fetch(); await route.abort('failed');}else await route.continue();});
  await guest.getByRole('button',{name:'Pošalji feedback',exact:true}).click(); await expect(guest.getByRole('alert')).toBeVisible(); await expect(guest.getByLabel('1. Šta je bilo najbolje?')).toHaveValue('Mentori su odlični.');
  await guest.getByRole('button',{name:'Pošalji feedback',exact:true}).click(); await expect(guest.getByRole('heading',{name:'Hvala na utiscima!'})).toBeVisible(); expect(sent[1]).toEqual(sent[0]); await guest.unrouteAll();
  for(let i=0;i<2;i++){await guest.getByRole('button',{name:'Popuni ponovo'}).click();await guest.getByLabel('Vaš mejl').fill('guest@example.com');await guest.getByLabel('1. Šta je bilo najbolje?').fill(`Odgovor ${i+2}`);await guest.getByLabel('Mentori',{exact:true}).check();await guest.waitForTimeout(30000);await guest.getByRole('button',{name:'Pošalji feedback',exact:true}).click();await expect(guest.getByRole('heading',{name:'Hvala na utiscima!'})).toBeVisible();}
  await page.getByRole('button',{name:'Osveži odgovore'}).click(); await expect(page.getByRole('heading',{name:'Odgovori · 3',exact:true})).toBeVisible(); await page.locator('summary').last().click(); await expect(page.getByText('Mentori, Radionice',{exact:true})).toBeVisible(); await expect(page.getByText('guest@example.com')).not.toBeVisible();
  let summaryCalls=0;
  await page.route('**/api/surveys/*/summary',async route=>{
    summaryCalls++;
    expect(route.request().method()).toBe('POST'); expect(route.request().postDataJSON()).toEqual({});
    if(summaryCalls===1) {await route.fulfill({status:503,json:{error:{code:'SUMMARY_UNAVAILABLE',message:'Gemma API nije dostupan. Pokušajte ponovo.'}}});return;}
    await new Promise(resolve=>setTimeout(resolve,250));
    await route.fulfill({json:{summary:{surveyId:privateUrl.split('/').at(-1),responseCount:3,generatedAt:new Date().toISOString(),model:'gemma-test',overview:'Učesnici hvale mentore.',themes:['Mentorstvo'],positiveHighlights:['Odlični mentori'],improvements:[],suggestedActions:['Nastaviti mentorstvo']}}});
  });
  await page.getByRole('button',{name:'Sumiraj',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Gemma API nije dostupan');
  await page.getByRole('button',{name:'Sumiraj',exact:true}).click();await expect(page.getByRole('button',{name:'Sažimanje…',exact:true})).toBeDisabled();
  await expect(page.getByRole('heading',{name:'AI sažetak',exact:true})).toBeVisible();await expect(page.getByText('Učesnici hvale mentore.',{exact:true})).toBeVisible();expect(summaryCalls).toBe(2);
  await guest.getByRole('button',{name:'Popuni ponovo'}).click();await guest.getByLabel('Vaš mejl').fill('guest@example.com');await guest.getByLabel('1. Šta je bilo najbolje?').fill('Novi utisak');await guest.getByLabel('Mentori',{exact:true}).check();await guest.waitForTimeout(30000);await guest.getByRole('button',{name:'Pošalji feedback',exact:true}).click();
  await page.getByRole('button',{name:'Osveži odgovore'}).click();await expect(page.getByText('Stigli su novi odgovori. Kliknite „Sumiraj” za ažuriran sažetak.')).toBeVisible();
  await page.screenshot({path:'test-results/organizer-detail.png',fullPage:true});
  await guest.getByRole('button',{name:'Popuni ponovo'}).click();await guest.screenshot({path:'test-results/public-mobile.png',fullPage:true});
  const other=await browser.newContext();const b=await other.newPage();await register(b,crypto.randomUUID());await b.goto(privateUrl);await expect(b.getByRole('alert')).toContainText('Anketa nije dostupna');
  await page.getByRole('button',{name:'Odjavi se'}).click();await page.goto(privateUrl);await expect(page.getByRole('heading',{name:'Dobro došli nazad'})).toBeVisible();expect(browserErrors).toEqual([]);await ctx.close();await other.close();
});

test('invalid link, login errors and editor validation are visible without losing input',async({page})=>{
  await page.goto('/s/invalid');await expect(page.getByRole('heading',{name:'Anketa nije dostupna'})).toBeVisible();
  const suffix=crypto.randomUUID();await register(page,suffix);await page.getByRole('button',{name:'Odjavi se'}).click();await page.getByLabel('Mejl',{exact:true}).fill(`${suffix}@example.com`);await page.getByLabel('Lozinka',{exact:true}).fill('wrong123');await page.getByRole('button',{name:'Prijavi se',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Mejl ili lozinka nisu ispravni.');await expect(page.getByLabel('Mejl',{exact:true})).toHaveValue(`${suffix}@example.com`);
  await page.getByLabel('Lozinka',{exact:true}).fill('demo123');await page.getByRole('button',{name:'Prijavi se',exact:true}).click();await page.getByRole('link',{name:'+ Nova anketa',exact:true}).click();await page.getByRole('button',{name:'Generiši link',exact:true}).click();await expect(page.getByText('Unesite naslov (1–120 znakova).')).toBeVisible();
  await page.getByLabel('Naslov ankete').fill('Validacija opcija');await page.getByLabel('Tekst pitanja').fill('Pitanje');await page.getByRole('button',{name:'+ Checkbox pitanje',exact:true}).click();await page.getByLabel('Tekst pitanja').nth(1).fill('Izbor');await page.getByLabel('Opcija 1',{exact:true}).fill('Isto');await page.getByLabel('Opcija 2',{exact:true}).fill(' isto ');await page.getByRole('button',{name:'Generiši link',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Opcije moraju imati različite nazive.');await expect(page.getByLabel('Naslov ankete')).toHaveValue('Validacija opcija');
});

test('demo volume opens 10 surveys and 200 responses within two seconds',async({page})=>{
  test.setTimeout(120000);
  await register(page,crypto.randomUUID());const token=await page.evaluate(()=>sessionStorage.getItem('gemify.session')!);const headers={Authorization:`Bearer ${token}`};let id='';
  for(let i=0;i<10;i++) {
    const qid=crypto.randomUUID();const created=await page.request.post('/api/surveys',{headers,data:{title:`Demo ${i+1}`,description:'',questions:[{id:qid,type:'text',label:'Utisak',required:true}]}});expect(created.status()).toBe(201);id=(await created.json()).survey.id;
    const published=await page.request.post(`/api/surveys/${id}/publish`,{headers});const publicToken=(await published.json()).survey.shareUrl.split('/').at(-1);
    for(let j=0;j<200;j+=20) {const submissions=await Promise.all(Array.from({length:20},(_,k)=>page.request.post(`/api/public/surveys/${publicToken}/responses`,{data:{clientRequestId:crypto.randomUUID(),respondentEmail:'demo@example.com',durationMs:30_000,answers:[{questionId:qid,value:`Utisak ${j+k+1}`}]}})));expect(submissions.every(r=>r.status()===201)).toBe(true);}
  }
  let start=Date.now();await page.goto('/surveys');await expect(page.locator('.survey-grid .card')).toHaveCount(10);const listMs=Date.now()-start;
  start=Date.now();await page.goto(`/surveys/${id}`);await expect(page.locator('details')).toHaveCount(200);const detailMs=Date.now()-start;
  console.log(`Browser navigation + render: list ${listMs} ms, detail ${detailMs} ms (10 × 200).`);expect(listMs).toBeLessThan(2000);expect(detailMs).toBeLessThan(2000);
});
