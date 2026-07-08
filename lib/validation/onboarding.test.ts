// Tests for the onboarding identity guard — the fix for the Jared/Paige
// incident, where a reused invite link overwrote an existing client. Completing
// an invite must only fill blank fields and never erase existing details.

import { describe, it, expect } from 'vitest';
import { fillBlankIdentity, type ClientIdentity } from './onboarding';

const incoming: ClientIdentity = {
  name: 'Paige Moore',
  company: 'Cana Co Films',
  email: 'goodinpaige@gmail.com',
  phone: '7028851403',
};

describe('fillBlankIdentity', () => {
  it('never overwrites an established client (the Jared/Paige case)', () => {
    const jared: ClientIdentity = {
      name: 'Jared Stanton',
      company: 'Truth Belt Co',
      email: 'jared@truthbelt.co',
      phone: '5551234567',
    };
    expect(fillBlankIdentity(jared, incoming)).toEqual(jared);
  });

  it('fills only the blank fields of a stub client', () => {
    const stub: ClientIdentity = { name: 'Jared Stanton', company: null, email: null, phone: null };
    expect(fillBlankIdentity(stub, incoming)).toEqual({
      name: 'Jared Stanton', // kept
      company: 'Cana Co Films', // filled
      email: 'goodinpaige@gmail.com', // filled
      phone: '7028851403', // filled
    });
  });

  it('treats empty/whitespace strings as blank and fills them', () => {
    const stub: ClientIdentity = { name: 'Jared Stanton', company: '   ', email: '', phone: null };
    const merged = fillBlankIdentity(stub, incoming);
    expect(merged.company).toBe('Cana Co Films');
    expect(merged.email).toBe('goodinpaige@gmail.com');
  });

  it('leaves a field null when neither side has a value', () => {
    const stub: ClientIdentity = { name: 'A', company: null, email: null, phone: null };
    const blankIncoming: ClientIdentity = { name: 'A', company: null, email: null, phone: null };
    expect(fillBlankIdentity(stub, blankIncoming).company).toBeNull();
  });
});
