// Multi-page automation script for Playwright CLI
// Execute with: playwright exec examples/multi-page-script.js

async function searchMultipleSites() {
  console.log('🔍 Starting multi-site search automation...');
  
  // Search on Google
  await page.goto('https://google.com');
  await page.waitForSelector('textarea[name="q"]');
  await page.fill('textarea[name="q"]', 'playwright automation');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.g');
  
  const googleResults = await page.evaluate(() => {
    return document.querySelector('#result-stats')?.textContent || 'No results';
  });
  console.log('Google:', googleResults);
  
  // Open GitHub in new tab
  const githubPage = await context.newPage();
  await githubPage.goto('https://github.com');
  await githubPage.waitForSelector('input[name="q"]');
  await githubPage.fill('input[name="q"]', 'playwright');
  await githubPage.keyboard.press('Enter');
  await githubPage.waitForSelector('.repo-list');
  
  const repoCount = await githubPage.evaluate(() => {
    const repos = document.querySelectorAll('.repo-list-item');
    return repos.length;
  });
  console.log('GitHub repos found:', repoCount);
  
  // Open Stack Overflow in another tab
  const stackPage = await context.newPage();
  await stackPage.goto('https://stackoverflow.com');
  await stackPage.waitForSelector('#search input');
  await stackPage.fill('#search input', 'playwright automation');
  await stackPage.keyboard.press('Enter');
  await stackPage.waitForSelector('.question-summary');
  
  const questionCount = await stackPage.evaluate(() => {
    return document.querySelectorAll('.question-summary').length;
  });
  console.log('Stack Overflow questions:', questionCount);
  
  // Take screenshots of all pages
  await page.screenshot({ path: 'google-search.png' });
  await githubPage.screenshot({ path: 'github-search.png' });
  await stackPage.screenshot({ path: 'stackoverflow-search.png' });
  
  console.log('✅ Screenshots saved!');
  
  // Return summary
  return {
    google: googleResults,
    githubRepos: repoCount,
    stackQuestions: questionCount,
    screenshots: ['google-search.png', 'github-search.png', 'stackoverflow-search.png']
  };
}

// Execute the automation
searchMultipleSites().then(result => {
  console.log('📊 Summary:', JSON.stringify(result, null, 2));
});