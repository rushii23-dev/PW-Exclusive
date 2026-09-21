/**
 * Sample documents for the demo and the test suite.
 *
 * Each is realistic drafting with deliberately planted patterns from the risk
 * lexicon, so a first-time visitor sees the full analysis without having to
 * find a contract of their own — and the tests can assert that known flags
 * in known places are found.
 */

export interface SampleDocument {
  id: string;
  title: string;
  description: string;
  text: string;
}

export const RENTAL_AGREEMENT = `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is made on 1st March 2025 between Mr. Rajesh Kumar (the "Landlord") and Ms. Priya Sharma (the "Tenant") for the residential premises at Flat 4B, Green Meadows Apartments, Bengaluru.

1. TERM
The lease shall commence on 1st April 2025 for a period of eleven (11) months. The lease shall be deemed renewed automatically for successive terms of eleven months each unless the Tenant delivers written notice of non-renewal at least sixty (60) days before the end of the then-current term.

2. RENT AND ESCALATION
The Tenant shall pay rent of Rs. 32,000 per month, in advance, on or before the 5th day of each month. Rent shall be increased by 10% at the start of each renewal term. Any payment received after the 5th shall attract a late fee of 2% per month on the outstanding amount.

3. SECURITY DEPOSIT
The Tenant shall pay a security deposit of Rs. 3,20,000. The Landlord may deduct from the security deposit any amounts for damages, cleaning, repainting, or other charges at his sole discretion. The deposit shall be refunded within ninety (90) days of vacation of the premises.

4. LOCK-IN PERIOD
The parties agree to a lock-in period of six (6) months. If the Tenant vacates during the lock-in period, the Tenant shall pay the rent for the remaining months of the lock-in period as an early termination charge.

5. MAINTENANCE AND REPAIRS
The Tenant shall be responsible for all repairs and maintenance of the premises, including plumbing, electrical fittings, and appliances, regardless of cause.

6. ENTRY
The Landlord or his agents may enter the premises at any time to inspect the condition thereof.

7. SUBLETTING
The Tenant shall not sublet, assign or part with possession of the premises or any part thereof without the prior written consent of the Landlord.

8. TERMINATION
The Landlord may terminate this agreement at any time by giving fifteen (15) days notice to the Tenant. The Tenant may terminate only after the lock-in period, by giving two (2) months written notice.

9. NOTICES
All notices under this Agreement shall be in writing and delivered by registered post to the addresses stated above.

10. GOVERNING LAW
This Agreement shall be governed by the laws of India, and the courts at Bengaluru shall have exclusive jurisdiction over any dispute arising hereunder.

11. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations and understandings, whether written or oral.`;

export const EMPLOYMENT_CONTRACT = `EMPLOYMENT AGREEMENT

This Employment Agreement is entered into on 15 January 2025 between Techverse Solutions Pvt. Ltd. (the "Company") and Mr. Arjun Mehta (the "Employee").

1. POSITION AND DUTIES
The Employee is appointed as Software Engineer and shall perform such duties as the Company may assign from time to time. The Employee shall devote his entire working time to the Company and shall not engage in any other employment or business.

2. COMPENSATION
The Employee shall receive an annual compensation of Rs. 12,00,000, payable in monthly installments, subject to statutory deductions. The Company may withhold salary or deduct from the salary any amounts owed by the Employee to the Company, including recovery of training costs.

3. PROBATION
The Employee shall be on a probationary period of six (6) months, during which the Company may terminate the employment without notice and without assigning any reason.

4. TRAINING BOND
In consideration of specialised training provided, the Employee agrees to serve the Company for a minimum period of twenty-four (24) months following completion of training. If the Employee resigns before this period, the Employee shall pay the Company Rs. 2,00,000 as training cost recovery.

5. CONFIDENTIALITY
The Employee shall keep confidential all Confidential Information of the Company, its clients and partners, both during employment and perpetually after its termination. Confidential Information means all information disclosed to or learned by the Employee, in whatever form.

6. INTELLECTUAL PROPERTY
The Employee hereby assigns to the Company all right, title and interest in all inventions, works of authorship, designs and other work product created during the term of employment, whether or not created during working hours or using Company resources. All such works shall be considered work made for hire.

7. NON-COMPETE
For a period of twenty-four (24) months after termination of employment, the Employee shall not engage in, be employed by, or provide services to any business that competes with the Company anywhere in India.

8. NON-SOLICITATION
For twelve (12) months after termination, the Employee shall not directly or indirectly solicit any employee, client or customer of the Company to terminate their relationship with the Company.

9. TERMINATION
After probation, either party may terminate this agreement by giving sixty (60) days written notice; provided that the Company may terminate the Employee at any time without cause by payment of fifteen (15) days salary in lieu of notice. The Company may terminate without notice for cause, at its sole discretion.

10. DISPUTE RESOLUTION
Any dispute arising out of this Agreement shall be resolved exclusively by binding arbitration before a sole arbitrator appointed by the Company, seated in Mumbai. The Employee waives any right to pursue claims as part of any class or representative proceeding.

11. SURVIVAL
Clauses 5, 6, 7 and 8 shall survive the termination of this Agreement.`;

export const NDA = `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement is made on 10 February 2025 between Brightpath Analytics LLP ("First Party") and Ms. Kavya Nair, an independent consultant ("Second Party"). Each party may disclose Confidential Information to the other in connection with a proposed data analytics engagement (the "Purpose").

1. CONFIDENTIAL INFORMATION
"Confidential Information" means non-public information disclosed by either party (the "Disclosing Party") to the other (the "Receiving Party"), marked as confidential or reasonably understood to be confidential, including business plans, client lists, financial data and technical material.

2. EXCLUSIONS
Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was known to the Receiving Party before disclosure; (c) is independently developed by the Receiving Party without use of the Confidential Information; or (d) is required to be disclosed by law or court order, provided the Receiving Party gives prompt written notice to the Disclosing Party.

3. OBLIGATIONS
The Receiving Party shall hold all Confidential Information in strict confidence, shall use it solely for the Purpose, and shall not disclose it to any third party except to employees and advisers who need to know it for the Purpose and are bound by obligations at least as protective as these.

4. TERM
This Agreement is effective from the date first written above and the obligations of confidentiality shall continue for a period of three (3) years from the date of disclosure.

5. RETURN OF MATERIALS
Upon written request of the Disclosing Party, the Receiving Party shall return or destroy all materials containing Confidential Information within thirty (30) days.

6. NO LICENSE
Nothing in this Agreement grants either party any rights in or to the other party's Confidential Information except the limited right to use it for the Purpose.

7. REMEDIES
Each party acknowledges that unauthorised disclosure may cause irreparable harm for which damages alone would be inadequate, and that the Disclosing Party shall be entitled to seek injunctive relief in addition to any other remedies available at law.

8. GOVERNING LAW
This Agreement shall be governed by the laws of India. The courts at Kochi shall have exclusive jurisdiction over any dispute arising out of this Agreement.

9. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties concerning its subject matter and supersedes all prior discussions and understandings.`;

export const FREELANCE_AGREEMENT = `INDEPENDENT CONTRACTOR SERVICES AGREEMENT

This Services Agreement is made on 5 March 2025 between Pixelforge Media LLC (the "Client") and Mr. Dev Patel (the "Contractor") for graphic design services.

1. SERVICES
The Contractor shall provide design services as described in the attached Statement of Work, and such additional services as the Client may reasonably request. Time is of the essence in the performance of all services.

2. COMPENSATION
The Client shall pay the Contractor a fee of USD 4,000 for the deliverables described in the Statement of Work. Payment is conditional upon the Client's acceptance of the deliverables. No payment shall be due until the Client, at its sole discretion, approves the final deliverables. Approved invoices are payable within forty-five (45) days.

3. REVISIONS
The Contractor shall provide unlimited revisions to the deliverables until acceptance, at no additional charge.

4. INTELLECTUAL PROPERTY
Upon full payment, the Contractor hereby assigns to the Client all right, title and interest in the deliverables, which shall be considered work made for hire. The Contractor waives all moral rights in the deliverables.

5. INDEMNIFICATION
The Contractor shall indemnify, defend and hold harmless the Client, its officers and employees from and against all claims, damages, losses and expenses, including reasonable attorneys' fees, arising out of or related to the services or the deliverables.

6. LIABILITY
In no event shall the Client's aggregate liability under this Agreement exceed the fees actually paid to the Contractor. In no event shall either party be liable for any indirect, incidental, special or consequential damages.

7. TERMINATION
The Client may terminate this Agreement at any time, with or without cause, upon written notice. Upon termination, the Client shall have no obligation to pay for work not yet accepted. The Contractor may terminate only upon thirty (30) days written notice and completion of all work in progress.

8. NON-SOLICITATION
During the term and for twelve (12) months thereafter, the Contractor shall not solicit any client or customer of the Client introduced to the Contractor under this Agreement.

9. INDEPENDENT CONTRACTOR
The Contractor is an independent contractor. Nothing in this Agreement creates an employment, agency or partnership relationship. The Contractor is responsible for all taxes on amounts paid.

10. GOVERNING LAW AND DISPUTES
This Agreement shall be governed by the laws of the State of Delaware. Any dispute shall be resolved exclusively by binding arbitration in Wilmington, Delaware, and each party waives the right to trial by jury.`;

export const SUBSCRIPTION_TOS = `FITLIFE PRO — TERMS OF SERVICE

Last updated: 1 January 2025. These Terms of Service govern your use of the FitLife Pro fitness platform and mobile application (the "Service") operated by FitLife Digital Inc. ("we", "us"). By creating an account or using the Service, you agree to these Terms.

1. SUBSCRIPTION AND BILLING
The Service is offered on a subscription basis at USD 29.99 per month or USD 299 per year. Your subscription will automatically renew at the end of each billing period, and your payment method will be charged, unless you cancel at least twenty-four (24) hours before the end of the current period. All fees are non-refundable, including for partial periods.

2. FREE TRIAL
New users may receive a fourteen (14) day free trial. Unless you cancel before the trial ends, your payment method will be charged automatically for the first billing period.

3. PRICE CHANGES
We reserve the right to change our subscription fees at any time. Continued use of the Service after a price change constitutes acceptance of the new fees.

4. CHANGES TO THESE TERMS
We may modify these Terms at any time, at our sole discretion, without prior notice. Your continued use of the Service constitutes acceptance of the modified Terms.

5. USER CONTENT
By posting content on the Service, you grant us a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute and display such content in any media, including for marketing purposes, without compensation to you.

6. HEALTH DISCLAIMER
The Service provides fitness information only and is provided "as is" and "as available" without warranties of any kind, express or implied. We disclaim all warranties, including fitness for a particular purpose.

7. DATA
We may share your personal information, including health and activity data, with our affiliates and partners for analytics and marketing purposes, as further described in the Privacy Policy.

8. LIMITATION OF LIABILITY
To the maximum extent permitted by law, our total liability arising out of these Terms shall not exceed the amount you paid us in the three (3) months preceding the claim. We shall not be liable for any indirect, incidental, special or consequential damages.

9. TERMINATION
We may suspend or terminate your account at any time, at our sole discretion, without notice, for any conduct we believe violates these Terms or is harmful to other users or us. Upon termination, you will not receive any refund of prepaid fees.

10. DISPUTE RESOLUTION
Any dispute arising out of these Terms shall be resolved by final and binding arbitration on an individual basis. You waive your right to a jury trial and agree that claims may not be brought as a plaintiff or class member in any class or representative proceeding.

11. GOVERNING LAW
These Terms shall be governed by the laws of the State of California, and you submit to the exclusive jurisdiction of the courts located in San Francisco County for any matters not subject to arbitration.`;

/**
 * A PG / shared-accommodation licence drafted carelessly on purpose: words and
 * figures disagree, the deposit is stated twice with different amounts, two
 * cities are named for disputes, and a clause points at one that isn't there.
 * It exists to show the contradiction checks at work.
 */
export const PG_LICENCE = `PAYING GUEST ACCOMMODATION LICENCE

This Licence is made on 10th June 2025 between Mrs. Sunita Deshmukh (the "Owner") and Mr. Arjun Nair (the "Guest") for a furnished room at 22 Lake View Residency, Pune.

1. TERM
The licence is granted for a period of eleven (11) months starting 1st July 2025.

2. FEES
The Guest shall pay a monthly fee of Rs. 14,000, which includes food and electricity, on or before the 3rd of each month. A late fee of Rs. 200 per day shall apply after the due date.

3. SECURITY DEPOSIT
The Guest shall pay a security deposit of Rs. 28,000 before moving in.

4. REFUND OF DEPOSIT
The security deposit of Rs. 42,000 shall be refunded within thirty (30) days of the Guest vacating, after deductions for damage as set out in Clause 11.

5. HOUSE RULES
Guests are not permitted after 10 PM. Cooking in the room is not allowed. The Owner may enter the room at any time for inspection.

6. TERMINATION BY THE GUEST
The Guest may terminate this licence by giving thirty (45) days written notice to the Owner.

7. TERMINATION BY THE OWNER
The Owner may terminate this licence at any time by giving seven (7) days notice, without assigning any reason.

8. JURISDICTION
The courts at Pune shall have exclusive jurisdiction over any dispute arising from this licence.

9. DISPUTES
Any claim by the Guest shall be heard only by the courts of Mumbai.`;

export const SAMPLES: SampleDocument[] = [
  {
    id: "rental",
    title: "Rental agreement",
    description: "An 11-month lease with an auto-renewal trap, a one-sided termination clause and a deposit that can vanish.",
    text: RENTAL_AGREEMENT,
  },
  {
    id: "employment",
    title: "Employment contract",
    description: "An offer with a training bond, a 24-month non-compete and arbitration run by the employer.",
    text: EMPLOYMENT_CONTRACT,
  },
  {
    id: "nda",
    title: "Mutual NDA",
    description: "A fairly standard non-disclosure agreement — useful to see what a reasonable document looks like.",
    text: NDA,
  },
  {
    id: "freelance",
    title: "Freelance contract",
    description: "A design gig where payment depends on the client's approval and revisions are unlimited.",
    text: FREELANCE_AGREEMENT,
  },
  {
    id: "tos",
    title: "Subscription terms",
    description: "A fitness app's terms: auto-renewal, unilateral changes, your data shared, your content licensed forever.",
    text: SUBSCRIPTION_TOS,
  },
  {
    id: "pg",
    title: "PG licence (has errors)",
    description: "A paying-guest agreement that contradicts itself: two deposit amounts, mismatched numbers, two courts and a missing clause.",
    text: PG_LICENCE,
  },
];

export function getSample(id: string): SampleDocument | undefined {
  return SAMPLES.find((s) => s.id === id);
}
