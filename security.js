/* ═══════════════════════════════════════════════════
   ═══ CTE Security Module v1.0 ═══
   ═══ Protocols: Input Defense | Database Integrity | Secrets | API Resilience
   ═══════════════════════════════════════════════════ */

;(function(global) {
  'use strict';

  const CTESec = {};

  // ═══════════════════════════════════════════════════
  // ═══ 1. CONFIG — Environment Variables Simulation ═══
  // ═══════════════════════════════════════════════════
  // In production, these come from a backend / .env file.
  // NEVER hardcode real secrets in client-side code.
  CTESec.config = {
    EMAILJS_SERVICE_ID: '__EMAILJS_SERVICE_ID__',   // Replace via env
    EMAILJS_TEMPLATE_ID: '__EMAILJS_TEMPLATE_ID__',
    EMAILJS_PUBLIC_KEY: '__EMAILJS_PUBLIC_KEY__',
    APP_ENV: '__APP_ENV__' || 'development',
    RATE_LIMIT_WINDOW: 60000,    // 1 minute
    RATE_LIMIT_MAX_SUBMITS: 3,   // max 3 submits per window
    SESSION_TIMEOUT: 1800000     // 30 min
  };

  // ═══════════════════════════════════════════════════
  // ═══ 2. INPUT SANITIZATION — Anti-XSS ═══
  // ═══════════════════════════════════════════════════
  CTESec.sanitize = (str) => {
    if (typeof str !== 'string') return '';
    const map = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#x27;', '/': '&#x2F;'
    };
    const reg = /[&<>"'/]/g;
    return str.replace(reg, (match) => map[match]).trim();
  };

  CTESec.sanitizeHTML = (str) => {
    const s = CTESec.sanitize(str);
    return s.replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');
  };

  // ═══════════════════════════════════════════════════
  // ═══ 3. INPUT VALIDATION ═══
  // ═══════════════════════════════════════════════════
  CTESec.validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: (v) => /^\+?\d{7,15}$/.test(v.replace(/[\s\-\(\)]/g, '')),
    alphanumeric: (v) => /^[a-zA-Z0-9\s\-_.,'àâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]+$/.test(v),
    required: (v) => typeof v === 'string' && v.trim().length > 0,
    minLength: (v, n) => v.trim().length >= n,
    maxLength: (v, n) => v.trim().length <= n,
    year: (v) => ['1','2','3','4','5'].includes(v),
    url: (v) => /^https?:\/\/.+/.test(v)
  };

  // ═══════════════════════════════════════════════════
  // ═══ 4. FORM VALIDATOR — متكامل مع حقول HTML ═══
  // ═══════════════════════════════════════════════════
  CTESec.validateForm = (formId, rules) => {
    const errors = {};
    const form = document.getElementById(formId);
    if (!form) return { valid: false, errors: { _form: 'Form not found' } };

    for (const field in rules) {
      const input = form.querySelector(`[name="${field}"]`) || document.getElementById(field);
      if (!input) continue;
      const value = input.value || '';
      const sanitized = CTESec.sanitize(value);
      const fieldRules = rules[field];

      for (const rule of fieldRules) {
        if (rule === 'required' && !CTESec.validators.required(value)) {
          errors[field] = input.dataset.reqMsg || 'This field is required';
          break;
        }
        if (rule === 'email' && !CTESec.validators.email(value)) {
          errors[field] = input.dataset.emailMsg || 'Invalid email';
          break;
        }
        if (rule === 'phone' && !CTESec.validators.phone(value)) {
          errors[field] = input.dataset.phoneMsg || 'Invalid phone number';
          break;
        }
        if (rule === 'year' && !CTESec.validators.year(value)) {
          errors[field] = 'Please select an academic year';
          break;
        }
        if (typeof rule === 'object' && rule.minLength && !CTESec.validators.minLength(value, rule.minLength)) {
          errors[field] = `Minimum ${rule.minLength} characters`;
          break;
        }
        if (typeof rule === 'object' && rule.maxLength && !CTESec.validators.maxLength(value, rule.maxLength)) {
          errors[field] = `Maximum ${rule.maxLength} characters`;
          break;
        }
      }

      // Store sanitized value back for safe submission
      input.dataset.sanitized = sanitized;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // ═══════════════════════════════════════════════════
  // ═══ 5. RATE LIMITER — Client-side Throttle ═══
  // ═══════════════════════════════════════════════════
  CTESec.rateLimiter = (() => {
    const store = {};
    return {
      check: (key, maxSubmits, windowMs) => {
        const now = Date.now();
        if (!store[key]) store[key] = [];
        const timestamps = store[key].filter(t => now - t < (windowMs || CTESec.config.RATE_LIMIT_WINDOW));
        store[key] = timestamps;
        if (timestamps.length >= (maxSubmits || CTESec.config.RATE_LIMIT_MAX_SUBMITS)) {
          const retryAfter = Math.ceil(((windowMs || CTESec.config.RATE_LIMIT_WINDOW) - (now - timestamps[0])) / 1000);
          return { allowed: false, retryAfter };
        }
        timestamps.push(now);
        return { allowed: true };
      },
      reset: (key) => { delete store[key]; }
    };
  })();

  // ═══════════════════════════════════════════════════
  // ═══ 6. CSRF TOKEN — Simple Implementation ═══
  // ═══════════════════════════════════════════════════
  CTESec.csrf = (() => {
    const TOKEN_KEY = 'cte_csrf_token';
    return {
      generate: () => {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
        sessionStorage.setItem(TOKEN_KEY, token);
        return token;
      },
      get: () => sessionStorage.getItem(TOKEN_KEY) || CTESec.csrf.generate(),
      validate: (token) => token === sessionStorage.getItem(TOKEN_KEY)
    };
  })();

  // ═══════════════════════════════════════════════════
  // ═══ 7. SECURE FORM HANDLER ═══
  // ═══════════════════════════════════════════════════
  CTESec.secureSubmit = (formId, rules, callback) => {
    const form = document.getElementById(formId);
    if (!form) { console.error('[CTESec] Form not found:', formId); return; }

    // Validate rate limit
    const rlKey = `form_${formId}`;
    const rl = CTESec.rateLimiter.check(rlKey);
    if (!rl.allowed) {
      const err = { success: false, error: 'rate_limit', retryAfter: rl.retryAfter };
      if (callback) callback(err);
      return err;
    }

    // Validate inputs
    const result = CTESec.validateForm(formId, rules);
    if (!result.valid) {
      const err = { success: false, error: 'validation', fields: result.errors };
      if (callback) callback(err);
      return err;
    }

    // Collect sanitized data
    const data = {};
    for (const field in rules) {
      const input = form.querySelector(`[name="${field}"]`) || document.getElementById(field);
      if (input) data[field] = input.dataset.sanitized || CTESec.sanitize(input.value);
    }
    data._csrf = CTESec.csrf.get();
    data._timestamp = Date.now();

    const ok = { success: true, data };
    if (callback) callback(ok);
    return ok;
  };

  // ═══════════════════════════════════════════════════
  // ═══ 8. SECURITY HEADERS INFO ═══
  // ═══════════════════════════════════════════════════
  // These should be set server-side in production.
  // Recommended headers:
  //   Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;
  //   X-Content-Type-Options: nosniff
  //   X-Frame-Options: DENY
  //   Strict-Transport-Security: max-age=31536000; includeSubDomains
  //   Referrer-Policy: strict-origin-when-cross-origin
  //   Permissions-Policy: geolocation=(), camera=(), microphone=()

  CTESec.securityMetaHTML = () => `
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="X-Frame-Options" content="DENY" />
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta http-equiv="Permissions-Policy" content="geolocation=(), camera=(), microphone=()" />
  `;

  // ═══════════════════════════════════════════════════
  // ═══ 9. EXPOSE ═══
  // ═══════════════════════════════════════════════════
  global.CTESec = CTESec;

})(window);
