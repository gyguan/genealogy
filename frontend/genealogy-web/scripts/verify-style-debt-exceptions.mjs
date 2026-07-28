import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('style-debt-exceptions.json', 'utf8'));
const exceptions = data.exceptions || [];
if (!exceptions.length) {
  console.log('No style debt exceptions registered.');
  process.exit(0);
}

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token) {
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required when style debt exceptions exist.');
}

const uniqueIssues = [...new Set(exceptions.map(item => item.trackingIssue))];
for (const issueNumber of uniqueIssues) {
  const response = await fetch(`https://api.github.com/repos/${repository}/issues/${issueNumber}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) throw new Error(`Unable to verify tracking issue #${issueNumber}: HTTP ${response.status}`);
  const issue = await response.json();
  if (issue.pull_request) throw new Error(`Style exception tracking #${issueNumber} must be an issue, not a pull request.`);
  if (issue.state !== 'open') throw new Error(`Style exception tracking issue #${issueNumber} is ${issue.state}; it must remain open.`);
  console.log(`Verified open style exception tracking issue #${issueNumber}: ${issue.title}`);
}
