const completionToken = 'XSS_PREVIEW_CONFIRMED';

function hasTrainingMarkup(feedback: string) {
  return /<script\b|\son[a-z]+\s*=/i.test(feedback);
}

/**
 * Deliberately reflects fixed-lab input into a separately sandboxed document.
 * The document has an opaque origin and a restrictive CSP, so it cannot read
 * CyberLab cookies, platform DOM, or make network requests.
 */
export function renderFeedbackSearch(feedback: string) {
  const document = `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:">
<style>body{margin:0;padding:16px;background:#0b1120;color:#e2e8f0;font:14px system-ui}#xss-status{color:#67e8f9;font-weight:600}</style>
<h1>Feedback Search</h1>
<p id="xss-status">Search results for your feedback:</p>
<div id="feedback-result">${feedback}</div>`;

  return {
    document,
    completionToken: hasTrainingMarkup(feedback) ? completionToken : null,
  };
}
