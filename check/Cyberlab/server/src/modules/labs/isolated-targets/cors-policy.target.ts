export interface CorsRequestHeader {
  name: string;
  value: string;
}

export interface CorsSimulationInput {
  origin?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: CorsRequestHeader[];
  credentials: boolean;
}

interface LearnerProgress {
  exposedThroughPermissivePolicy: boolean;
  comparedPreflightPolicies: boolean;
  observedWildcardCredentialBlock: boolean;
}

interface PolicyResult {
  responseHeaders: Record<string, string>;
  preflightRequired: boolean;
  preflightResponseHeaders: Record<string, string> | null;
  preflightAllowed: boolean | null;
  actualRequestProcessed: boolean;
  browserCanReadResponse: boolean;
  browserExplanation: string;
  syntheticResponse: string | null;
}

export interface CorsSimulationResult {
  origin: { supplied: string | null; normalized: string | null; valid: boolean; trusted: boolean };
  request: { method: string; headers: CorsRequestHeader[]; credentials: boolean; preflightRequired: boolean };
  policies: {
    permissive: PolicyResult;
    allowlist: PolicyResult;
    wildcardWithCredentials: PolicyResult;
  };
  completionToken: string | null;
}

const trustedOrigins = new Set(['https://app.training.test']);
const syntheticResponse = 'Synthetic profile response: Training learner, account note CORS_POLICY_READ_CONFIRMED.';
const permissiveMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const permissiveHeaders = ['accept', 'content-type', 'x-training-client'];
const secureMethods = ['GET', 'POST'];
const secureHeaders = ['accept', 'content-type'];
const learnerProgress = new Map<string, LearnerProgress>();

function parseOrigin(value: string | undefined) {
  if (!value || value.length > 200) return null;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isSafelistedHeader(header: CorsRequestHeader) {
  const name = header.name.toLowerCase();
  if (['accept', 'accept-language', 'content-language'].includes(name)) return true;
  if (name !== 'content-type') return false;
  const mediaType = header.value.split(';', 1)[0]?.trim().toLowerCase();
  return ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'].includes(mediaType ?? '') && header.value.length <= 128;
}

function requiresPreflight(input: CorsSimulationInput) {
  return !['GET', 'HEAD', 'POST'].includes(input.method) || input.headers.some((header) => !isSafelistedHeader(header));
}

function canRead(headers: Record<string, string>, origin: string | null, credentials: boolean) {
  if (!origin) return false;
  const allowedOrigin = headers['Access-Control-Allow-Origin'];
  if (allowedOrigin !== origin && allowedOrigin !== '*') return false;
  if (credentials && (allowedOrigin === '*' || headers['Access-Control-Allow-Credentials'] !== 'true')) return false;
  return true;
}

function buildHeaders(
  policy: 'permissive' | 'allowlist' | 'wildcard',
  origin: string | null,
  preflight = false,
) {
  const headers: Record<string, string> = {};
  if (!origin) return headers;
  if (policy === 'permissive') {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (policy === 'allowlist' && trustedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (policy === 'wildcard') {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  if (!preflight) return headers;
  if (policy === 'permissive') {
    headers['Access-Control-Allow-Methods'] = permissiveMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = permissiveHeaders.join(', ');
  } else if (policy === 'allowlist') {
    headers['Access-Control-Allow-Methods'] = secureMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = secureHeaders.join(', ');
  } else {
    headers['Access-Control-Allow-Methods'] = permissiveMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = permissiveHeaders.join(', ');
  }
  return headers;
}

function evaluatePolicy(input: CorsSimulationInput, origin: string | null, policy: 'permissive' | 'allowlist' | 'wildcard'): PolicyResult {
  const preflightRequired = requiresPreflight(input);
  const preflightHeaders = preflightRequired ? buildHeaders(policy, origin, true) : null;
  const allowedMethods = (preflightHeaders?.['Access-Control-Allow-Methods'] ?? '').split(',').map((value) => value.trim());
  const allowedHeaders = (preflightHeaders?.['Access-Control-Allow-Headers'] ?? '').split(',').map((value) => value.trim().toLowerCase());
  const preflightAllowed = preflightRequired
    ? canRead(preflightHeaders ?? {}, origin, input.credentials) &&
      allowedMethods.includes(input.method) &&
      input.headers.every((header) => allowedHeaders.includes(header.name.toLowerCase()))
    : null;
  const actualRequestProcessed = !preflightRequired || preflightAllowed === true;
  const responseHeaders = actualRequestProcessed ? buildHeaders(policy, origin) : {};
  const browserCanReadResponse = actualRequestProcessed && canRead(responseHeaders, origin, input.credentials);
  let browserExplanation: string;
  if (preflightRequired && !preflightAllowed) {
    browserExplanation = 'The simulated OPTIONS preflight was denied, so the browser would not send the actual request.';
  } else if (!origin) {
    browserExplanation = 'No valid Origin was supplied. This cross-origin simulation does not grant JavaScript access.';
  } else if (input.credentials && responseHeaders['Access-Control-Allow-Origin'] === '*') {
    browserExplanation = 'The server returned a wildcard origin with credentials enabled; a browser will not expose this credentialed response to JavaScript.';
  } else if (browserCanReadResponse) {
    browserExplanation = 'The simulated browser would allow JavaScript to read this synthetic response under these CORS headers.';
  } else {
    browserExplanation = 'The server processed the request, but its CORS response headers do not authorize this origin to read the response.';
  }
  return {
    responseHeaders,
    preflightRequired,
    preflightResponseHeaders: preflightHeaders,
    preflightAllowed,
    actualRequestProcessed,
    browserCanReadResponse,
    browserExplanation,
    syntheticResponse: browserCanReadResponse ? syntheticResponse : null,
  };
}

/** Pure local policy simulation. It never sends a request or reads platform resources. */
export function simulateCorsPolicy(userId: string, input: CorsSimulationInput): CorsSimulationResult {
  const normalizedOrigin = parseOrigin(input.origin);
  const origin = {
    supplied: input.origin ?? null,
    normalized: normalizedOrigin,
    valid: normalizedOrigin !== null,
    trusted: normalizedOrigin !== null && trustedOrigins.has(normalizedOrigin),
  };
  const permissive = evaluatePolicy(input, normalizedOrigin, 'permissive');
  const allowlist = evaluatePolicy(input, normalizedOrigin, 'allowlist');
  const wildcardWithCredentials = evaluatePolicy(input, normalizedOrigin, 'wildcard');
  const progress = learnerProgress.get(userId) ?? {
    exposedThroughPermissivePolicy: false,
    comparedPreflightPolicies: false,
    observedWildcardCredentialBlock: false,
  };
  const isUntrusted = origin.valid && !origin.trusted;
  if (
    isUntrusted && input.credentials && !permissive.preflightRequired &&
    permissive.browserCanReadResponse && !allowlist.browserCanReadResponse
  ) progress.exposedThroughPermissivePolicy = true;
  if (
    isUntrusted && input.credentials && permissive.preflightRequired &&
    permissive.preflightAllowed && allowlist.preflightAllowed === false
  ) progress.comparedPreflightPolicies = true;
  if (
    input.credentials && wildcardWithCredentials.responseHeaders['Access-Control-Allow-Origin'] === '*' &&
    !wildcardWithCredentials.browserCanReadResponse
  ) progress.observedWildcardCredentialBlock = true;
  learnerProgress.set(userId, progress);
  const completed = progress.exposedThroughPermissivePolicy && progress.comparedPreflightPolicies && progress.observedWildcardCredentialBlock;
  return {
    origin,
    request: { method: input.method, headers: input.headers, credentials: input.credentials, preflightRequired: requiresPreflight(input) },
    policies: { permissive, allowlist, wildcardWithCredentials },
    completionToken: completed ? 'CORS_POLICY_READ_CONFIRMED' : null,
  };
}

export function hasCompletedCorsExercise(userId: string) {
  const progress = learnerProgress.get(userId);
  return Boolean(progress?.exposedThroughPermissivePolicy && progress.comparedPreflightPolicies && progress.observedWildcardCredentialBlock);
}

export function resetCorsExerciseState() {
  learnerProgress.clear();
}
