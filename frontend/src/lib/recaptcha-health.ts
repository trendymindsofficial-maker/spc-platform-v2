/*
|--------------------------------------------------------------------------
| RECAPTCHA REACHABILITY CHECK
|--------------------------------------------------------------------------
|
| Firebase phone auth depends on Google's reCAPTCHA. Privacy browsers and
| ad blockers (Brave Shields, uBlock, AdGuard, Pi-hole) block it, and when
| they do Firebase fails with auth/invalid-app-credential — an error that
| says nothing about the real cause and sends people hunting through their
| Firebase settings instead.
|
| This probes whether the reCAPTCHA endpoint is actually reachable from
| the browser so the UI can say "your browser is blocking this" with
| confidence instead of listing possibilities.
|
*/

const RECAPTCHA_PROBE_URL = "https://www.google.com/recaptcha/api.js";

export type RecaptchaHealth = "ok" | "blocked" | "unknown";

let cached: RecaptchaHealth | null = null;

/**
 * Loads the reCAPTCHA script the same way Firebase does.
 *
 * A blocked request fails fast (the extension aborts it), so this
 * normally settles in well under the timeout.
 */
export function checkRecaptchaReachable(
  timeoutMs = 6000
): Promise<RecaptchaHealth> {
  if (typeof window === "undefined") {
    return Promise.resolve("unknown");
  }

  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise<RecaptchaHealth>((resolve) => {
    /*
     * Firebase may already have loaded it successfully.
     */
    if (
      (window as { grecaptcha?: unknown }).grecaptcha ||
      document.querySelector(`script[src^="${RECAPTCHA_PROBE_URL}"]`)
    ) {
      cached = "ok";
      resolve("ok");
      return;
    }

    let settled = false;

    const finish = (result: RecaptchaHealth) => {
      if (settled) return;

      settled = true;
      cached = result;

      clearTimeout(timer);
      script.remove();

      resolve(result);
    };

    const script = document.createElement("script");

    script.src = `${RECAPTCHA_PROBE_URL}?render=explicit`;
    script.async = true;

    script.onload = () => finish("ok");

    /*
     * An ad blocker aborts the request, which surfaces as an error
     * event rather than a network response.
     */
    script.onerror = () => finish("blocked");

    const timer = setTimeout(() => finish("blocked"), timeoutMs);

    document.head.appendChild(script);
  });
}

/**
 * Human-readable explanation for a blocked probe.
 */
export const RECAPTCHA_BLOCKED_MESSAGE =
  "Your browser is blocking Google reCAPTCHA, which Firebase needs to " +
  "send an OTP.\n\n" +
  "If you use Brave: click the Shields (lion) icon in the address bar " +
  "and set Shields to DOWN for this site.\n\n" +
  "Otherwise disable your ad blocker or privacy extension for this " +
  "site, then reload the page.";
