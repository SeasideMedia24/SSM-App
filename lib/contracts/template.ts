// The Seaside Media services-agreement template, as code. `renderContract`
// merges a contract's variable fields into the full clause text and returns
// Markdown. The rendered output is SNAPSHOT into contracts.body_md when the
// owner sends it for signature, so later edits to this template never change an
// already-sent contract.
//
// Pure (no server/browser deps) so both the owner's live preview (client) and
// the send action (server) render from the same source.
//
// To change the contract wording, edit the clause text below. To change which
// values get filled in, edit ContractTerms + the merge points.

export type ContractTerms = {
  clientName: string;
  clientCompany?: string | null;
  projectName: string;
  effectiveDate?: string | null; // ISO 'YYYY-MM-DD'
  depositAmount: number;
  productionAmount: number;
  deliveryAmount: number;
  deliverables: string[];
  revisionRounds: number;
  revisionPct: number;
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const longDate = (iso?: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '\\_\\_\\_\\_\\_\\_\\_';

export function renderContract(t: ContractTerms): string {
  const client = t.clientCompany ? `${t.clientName} (${t.clientCompany})` : t.clientName;
  const deliverables =
    t.deliverables.length > 0
      ? t.deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')
      : '_(deliverables to be listed)_';

  return `# CONTRACT PROJECT AGREEMENT

This Services Agreement Contract ("Agreement") is entered into as of **${longDate(t.effectiveDate)}** (the "Effective Date"), by and between:

**Seaside Media LLC** ("Producer") and **${client || '\\_\\_\\_\\_\\_\\_\\_\\_'}** ("Client").

Collectively referred to as the "Parties."

## Project Name: ${t.projectName || '\\_\\_\\_\\_\\_\\_\\_\\_'}

**Amounts Due**

- Deposit due upon signature of this contract: **${usd(t.depositAmount)}**
- Amount due after production: **${usd(t.productionAmount)}**
- Amount due after post-production/delivery of final products: **${usd(t.deliveryAmount)}**

## Clauses

**1. Deliverables**

${deliverables}

**1.1 Change** — These are the video deliverables for this project, which are not subject to change unless agreed upon by both Parties. Projects will be completed by the Producer. In the event that the Producer is unable to complete said deliverables, the Producer will ensure that the deliverables are completed through offering of a contingency where another company will complete the deliverables. If agreed and signed upon by both Parties, an amendment for the deliverables can be made on this agreement.

**1.1.1 Change in Completed Project** — If at any time the Client desires to make any changes or variations from the completed project, or the script(s) or storyboard(s), and such changes result in additional costs to the Producer (including person hours), reimbursement for such additional costs shall be payable in accordance with the terms of this Agreement for final payment. Any alterations of original art creating additional art is prohibited without the express permission of the Producer. Unauthorized alterations shall constitute additional use and will be billed accordingly.

**1.2 Revisions** — Each video produced has **${t.revisionRounds}** round(s) of revisions at **${t.revisionPct}%** of the entire video. Each extra revision requested will be charged to the Client at the Producer's discretion.

**1.3 Quality** — It is the essence of this Agreement that all completed media and services supplied by the Producer shall be of applicable production standards, artistically produced with direction, photography, sound, art, animation, synchronization and other physical and aesthetic content as agreed upon in the Agreement.

**2. Payment(s)** — Client understands that payments for the project will be in halves. ½ is required upfront upon signature of this contract and ½ is required after filming on the designated production day.

**2.1 Missed Payments** — The final payment is required on final delivery of the product. For any late payments on any portion of the project, the Client may be charged, at the Producer's discretion, 10% on unpaid amounts until paid, compounded monthly.

**3. Date(s)** — TBD by Producer.

**3.1 Contingency Day(s)** — A contingency day is any day where a scheduled shoot has been prevented from occurring due to circumstances beyond the control of the production company (weather; injury, illness, or absence of client-supplied elements; force majeure; client-insured re-shoots). The Producer will quote a maximum "not to exceed" contingency day cost, which does not include premiums for crew or suppliers on weekends, holidays, or premium days.

**3.2 Cancellation and Postponement** — A cancellation or postponement is a rescheduling to a later specific date, or a total cancellation, caused or directed by Client. For **Video Production**: cancellation 1–10 working days before the shoot makes the Client liable for all out-of-pocket costs, the full director's fee, and the full production fee as bid; 11–15 working days before, all out-of-pocket costs plus not less than 50% of each; more than 15 working days before, all out-of-pocket costs plus not less than 25% of each. For **CGI/Animation/Audio** production, liability scales by the quarter of the schedule in which notice is given, up to the full cost of the job.

**3.3 Other Date Changes** — Any date changes besides those in clause 3.1 will result in the Client being charged a fee determined by the Producer based on time investment, travel, gear, equipment, or manpower for that shoot day.

**3.4 Effective Date** — Client understands the Effective Date of this contract.

**4. Ownership** — Except as otherwise provided, both Producer and Client own all rights, title and interest in and to the media which are the subject of this Agreement. The Producer owns all copyrights therein as well as in and to all exposed negatives, positives, RAW footage, out-takes and clips. Client does not have permission to post or claim any footage or media that is not explicitly listed as the final version of the product/project.

**5. Independent Contractor/Media Company** — The Producer's status is that of an independent contractor/independent company; all persons engaged by the Producer shall not be deemed employees of Client.

**6. Warranties and Responsibilities** — **6.1** The Producer represents it has full right to enter this Agreement and will comply with all applicable laws and union agreements, and will use reasonable efforts to obtain all licenses, consents and rights necessary to perform. **6.2** The Client is responsible for communicating with the Producer and crew during production. Failure to communicate within 5 days before, during, or 10 days after production may result in a fine at the Producer's discretion according to the expenses involved.

**7. Indemnification** — Client agrees to indemnify, defend, and hold harmless the Producer and its officers, employees, agents and licensees against any claims, actions, damages, liabilities and expenses arising out of the breach of any obligation, warranty or representation, or from uses for which the Client does not have rights.

**8. Tax Liability** — Any sales, use, or other tax payable on production and delivery (other than tax arising from Producer's purchases of materials) is the responsibility of Client.

**9. Assignments** — This Agreement may not be assigned by either party without the written consent of the other. **9.1 No Waiver** — Failure to exercise any right is not a waiver of it. **9.2 Enforceability** — If any provision is unenforceable, it does not affect the others.

**10. Securities/Confidentiality** — The Producer agrees, at Client's written request and within reason, to require those engaged for the production to sign appropriate agreements not to disclose confidential information except as necessary to produce the media.

**11. Furnishing Materials, Services, and Releases** — Producer shall deliver the completed media pursuant to this Agreement and clause 1, along with consents, waivers or releases from talent and persons who rendered services, to the extent permissible by applicable union or guild agreements.

**12. Dispute Resolutions** — The prevailing party in any legal action shall be entitled to attorney's fees and costs.

**13. Entire Agreement and Modification** — This Agreement and any Addenda constitute the entire agreement between the Parties. Any amendment must be in writing and signed by each party.

**14. Equal Opportunity** — Producer agrees not to discriminate against any employee or applicant because of race, religion, sexual orientation, color, sex, national origin, age, disability, or any other protected factor.

**15. Applicable Law** — This Agreement shall be governed by the local laws of the jurisdiction where the Production Company office authorizing this Agreement is located.

**IN WITNESS WHEREOF**, the Parties have executed this Agreement as of the Effective Date.

**Producer:** Seaside Media LLC — Jeremy N. Moore, Owner

**Client:** ${t.clientName || '\\_\\_\\_\\_\\_\\_\\_\\_'}

_*By providing an e-signature, the signee acknowledges and agrees that it constitutes a binding form of payment authorization._`;
}
