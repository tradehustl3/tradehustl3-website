import assert from 'node:assert/strict';
import test from 'node:test';
import { withCustomerScope } from '../worker/resume-presentation-content';
import { sampleResume } from '../docs/pr186/sample-resume';
test('scope comes from a uniquely matched customer role, never from AI-added scope or title', () => {
  const job = sampleResume.experience[0];
  const source = { experience: [{ jobTitle: job.jobTitle, employer: job.employer, leadership: 'Lead a two-person service crew across commercial accounts.' }] };
  assert.equal(withCustomerScope(sampleResume, JSON.stringify(source)).experience[0].scope, source.experience[0].leadership);
  assert.equal(withCustomerScope(sampleResume, '{}').experience[0].scope, undefined);
  assert.equal(withCustomerScope(sampleResume, '{invalid').experience[0].scope, undefined);
  assert.equal(withCustomerScope(sampleResume, JSON.stringify({ experience: [{ ...source.experience[0], employer: 'Other Employer' }] })).experience[0].scope, undefined);
  assert.equal(withCustomerScope(sampleResume, JSON.stringify({ experience: [source.experience[0], source.experience[0]] })).experience[0].scope, undefined);
  assert.equal(withCustomerScope(sampleResume, JSON.stringify({ experience: [{ jobTitle: job.jobTitle, employer: job.employer, scope: 'Commercial accounts' }] })).experience[0].scope, 'Commercial accounts');
  assert.equal(sampleResume.experience[0].scope, 'two-person service crew · commercial accounts', 'stored facts not mutated');
});
