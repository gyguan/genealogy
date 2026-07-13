import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authModeFromLocation,
  invitationTokenFromLocation,
  resetTokenFromLocation
} from './authPageModel.js';

test('authentication route defaults to login', () => {
  assert.equal(authModeFromLocation(''), 'login');
  assert.equal(authModeFromLocation('?auth=unknown'), 'login');
});

test('explicit authentication modes are restored from query parameters', () => {
  assert.equal(authModeFromLocation('?auth=forgot'), 'forgot');
  assert.equal(authModeFromLocation('?auth=reset'), 'reset');
  assert.equal(authModeFromLocation('?auth=invite'), 'invite');
});

test('one-time tokens select the matching workflow without exposing other state', () => {
  assert.equal(authModeFromLocation('?resetToken=reset-123'), 'reset');
  assert.equal(resetTokenFromLocation('?resetToken=reset-123'), 'reset-123');
  assert.equal(authModeFromLocation('?invitationToken=invite-456'), 'invite');
  assert.equal(invitationTokenFromLocation('?invitationToken=invite-456'), 'invite-456');
});
