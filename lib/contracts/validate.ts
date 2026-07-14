// One source of truth for "is this contract ready to send?". Returns the list
// of missing VARIABLE fields (empty list = ready). Used by the owner's contract
// editor to block "Send for signature" with a clear checklist, and reused as-is
// by PaePae before it sends — so the assistant and the human never disagree
// about whether a contract is complete.
//
// Pure (no deps) so it runs on both client and server.

export type ReadinessInput = {
  clientName: string | null | undefined;
  projectName: string | null | undefined;
  effectiveDate: string | null | undefined;
  depositAmount: number | null | undefined;
  productionAmount: number | null | undefined;
  deliveryAmount: number | null | undefined;
  revisionRounds: number | null | undefined;
  revisionPct: number | null | undefined;
  deliverablesCount: number;
};

export function contractReadiness(i: ReadinessInput): string[] {
  const missing: string[] = [];
  if (!i.clientName?.trim()) missing.push('Client name');
  if (!i.projectName?.trim()) missing.push('Project name');
  if (!i.effectiveDate) missing.push('Effective date');
  if (i.deliverablesCount <= 0) missing.push('At least one deliverable');
  if (!i.revisionRounds || i.revisionRounds < 1) missing.push('Number of revision rounds');
  if (i.revisionPct == null || i.revisionPct <= 0) missing.push('Revision coverage (%)');
  if (!i.depositAmount || i.depositAmount <= 0) missing.push('Deposit amount');
  // Production/delivery amounts may legitimately be $0 for some deals, but they
  // must be filled in (not left blank) so the payment schedule is explicit.
  if (i.productionAmount == null) missing.push('Amount due after production');
  if (i.deliveryAmount == null) missing.push('Amount due after delivery');
  return missing;
}

export const isContractReady = (i: ReadinessInput) => contractReadiness(i).length === 0;
