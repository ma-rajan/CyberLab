export type CouponAttemptId = 'attempt-a' | 'attempt-b';
export type CouponSimulationAction = 'inspect' | 'prepare' | 'record' | 'secure-batch';

export interface CouponSimulationInput {
  action: CouponSimulationAction;
  attemptId?: CouponAttemptId;
}

export interface CouponAttemptResult {
  attemptId: CouponAttemptId;
  accepted: boolean;
  message: string;
}

export interface CouponSimulationResult {
  action: CouponSimulationAction;
  product: { name: string; price: number };
  coupon: { code: string; maximumRedemptions: number };
  outcomes: CouponAttemptResult[];
  preparedEligibility: boolean | null;
  redemptionCount: number;
  invariantPreserved: boolean;
  completionReady: boolean;
  note: string;
}

interface VulnerableAttempt {
  eligibleAtPrepare: boolean;
  state: 'PREPARED' | 'RECORDED' | 'REJECTED';
}

interface SessionState {
  vulnerableRedemptionCount: number;
  vulnerableAttempts: Map<CouponAttemptId, VulnerableAttempt>;
  secureBatch: CouponAttemptResult[] | null;
}

const maximumRedemptions = 1;
const fixedProduct = { name: 'Training Desk Lamp', price: 40 };
const fixedCoupon = { code: 'SAVE-ONCE', maximumRedemptions };
const stateByLabSession = new Map<string, SessionState>();

function getSessionState(sessionId: string) {
  let state = stateByLabSession.get(sessionId);
  if (!state) {
    state = {
      vulnerableRedemptionCount: 0,
      vulnerableAttempts: new Map(),
      secureBatch: null,
    };
    stateByLabSession.set(sessionId, state);
  }
  return state;
}

function makeResult(
  session: SessionState,
  action: CouponSimulationAction,
  outcomes: CouponAttemptResult[] = [],
  preparedEligibility: boolean | null = null,
): CouponSimulationResult {
  const vulnerableRaceShown = session.vulnerableRedemptionCount > maximumRedemptions;
  const secureInvariantHeld = (session.secureBatch?.filter((attempt) => attempt.accepted).length ?? 0) <= maximumRedemptions;
  return {
    action,
    product: fixedProduct,
    coupon: fixedCoupon,
    outcomes,
    preparedEligibility,
    redemptionCount: action === 'secure-batch'
      ? (session.secureBatch?.filter((attempt) => attempt.accepted).length ?? 0)
      : session.vulnerableRedemptionCount,
    invariantPreserved: action === 'secure-batch' ? secureInvariantHeld : session.vulnerableRedemptionCount <= maximumRedemptions,
    completionReady: vulnerableRaceShown && secureInvariantHeld && Boolean(session.secureBatch),
    note: action === 'secure-batch'
      ? 'The simulator applied each request at one atomic state transition. This deterministic model does not prove database transaction isolation.'
      : 'The vulnerable workflow snapshots eligibility first and records redemption later; this is a deterministic interleaving, not real request scheduling.',
  };
}

/** Apply the two synthetic steps explicitly so both attempts can use the same stale snapshot. */
export function simulateCouponWorkflow(sessionId: string, input: CouponSimulationInput): CouponSimulationResult | null {
  const session = getSessionState(sessionId);

  if (input.action === 'inspect') return makeResult(session, input.action);

  if (input.action === 'prepare') {
    if (!input.attemptId || session.vulnerableAttempts.has(input.attemptId)) return null;
    const eligibleAtPrepare = session.vulnerableRedemptionCount < maximumRedemptions;
    session.vulnerableAttempts.set(input.attemptId, { eligibleAtPrepare, state: 'PREPARED' });
    return makeResult(session, input.action, [{
      attemptId: input.attemptId,
      accepted: eligibleAtPrepare,
      message: eligibleAtPrepare
        ? `Eligible at check time: ${session.vulnerableRedemptionCount} of ${maximumRedemptions} redemptions used.`
        : 'Rejected at check time because the coupon limit was already reached.',
    }], eligibleAtPrepare);
  }

  if (input.action === 'record') {
    if (!input.attemptId) return null;
    const attempt = session.vulnerableAttempts.get(input.attemptId);
    if (!attempt || attempt.state !== 'PREPARED') return null;
    if (!attempt.eligibleAtPrepare) {
      attempt.state = 'REJECTED';
      return makeResult(session, input.action, [{ attemptId: input.attemptId, accepted: false, message: 'The saved eligibility check rejected this attempt.' }], attempt.eligibleAtPrepare);
    }
    attempt.state = 'RECORDED';
    session.vulnerableRedemptionCount += 1;
    return makeResult(session, input.action, [{
      attemptId: input.attemptId,
      accepted: true,
      message: 'Recorded using the earlier eligibility result without checking the current redemption count.',
    }], attempt.eligibleAtPrepare);
  }

  if (!session.secureBatch) {
    // Deterministic linearization: each simulated request checks and updates the same state
    // synchronously before the next request is applied.
    let secureRedemptions = 0;
    session.secureBatch = (['attempt-a', 'attempt-b'] as const).map((attemptId) => {
      if (secureRedemptions >= maximumRedemptions) {
        return { attemptId, accepted: false, message: 'Rejected atomically: the redemption limit was reached.' };
      }
      secureRedemptions += 1;
      return { attemptId, accepted: true, message: 'Accepted atomically: the coupon use was reserved with the eligibility check.' };
    });
  }

  return makeResult(session, input.action, session.secureBatch);
}

export function hasCompletedBusinessLogicRace(sessionId: string) {
  const session = stateByLabSession.get(sessionId);
  return Boolean(
    session &&
    session.vulnerableRedemptionCount > maximumRedemptions &&
    session.secureBatch?.filter((attempt) => attempt.accepted).length === maximumRedemptions,
  );
}

export function resetBusinessLogicRaceState() {
  stateByLabSession.clear();
}
