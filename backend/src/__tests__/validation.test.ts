import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validatePassword, validatePin } from '../utils/validation';

describe('validation', () => {
  it('rejects weak passwords', () => {
    assert.ok(validatePassword('short'));
    assert.ok(validatePassword('nouppercase1!'));
    assert.ok(validatePassword('NoSpecial1'));
  });

  it('accepts strong passwords', () => {
    assert.strictEqual(validatePassword('Password1!'), null);
  });

  it('validates 6-digit PIN', () => {
    assert.ok(validatePin('12345'));
    assert.strictEqual(validatePin('123456'), null);
  });
});
