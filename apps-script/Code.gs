/**
 * Build Daggett Montessori Right — petition backend (Google Apps Script web app)
 *
 * Setup: see README.md, "Google Sheet setup".
 *  - Open your Google Sheet > Extensions > Apps Script, paste this file, save.
 *  - Deploy > New deployment > Web app
 *      Execute as: Me
 *      Who has access: Anyone
 *  - Copy the web-app URL into SCRIPT_URL in main.js.
 *
 * doPost(e) appends one row per signature and returns {ok:true}.
 * doGet(e)  returns {count: N} only. It never returns names, emails, or addresses.
 */

var SHEET_NAME = 'Signatures';

var HEADERS = [
  'Timestamp',
  'First name',
  'Last name',
  'Email',
  'Wants updates',
  'ZIP',
  'Street address',
  'Relationship',
  'Comment',
  'Consent',
];

// Max lengths, so nobody can stuff huge values into the sheet.
var LIMITS = {
  firstName: 60,
  lastName: 60,
  email: 120,
  updates: 3,
  zip: 10,
  address: 150,
  relationship: 200,
  comment: 500,
};

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Honeypot: real people never fill this in. Pretend success so bots move on.
  if (p.website) {
    return json_({ ok: true });
  }

  var firstName = clean_(p.firstName, LIMITS.firstName);
  var lastName = clean_(p.lastName, LIMITS.lastName);
  var zip = clean_(p.zip, LIMITS.zip);

  if (!firstName || !lastName || !/^\d{5}(-\d{4})?$/.test(zip) || p.consent !== 'yes') {
    return json_({ ok: false, error: 'missing_required_fields' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      firstName,
      lastName,
      clean_(p.email, LIMITS.email),
      p.updates === 'yes' ? 'yes' : 'no',
      zip,
      clean_(p.address, LIMITS.address),
      clean_(p.relationship, LIMITS.relationship),
      clean_(p.comment, LIMITS.comment),
      'yes',
    ]);
    CacheService.getScriptCache().remove('count');
  } catch (err) {
    return json_({ ok: false, error: 'server_busy' });
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true });
}

function doGet(e) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('count');
  if (cached !== null) {
    return json_({ count: Number(cached) });
  }
  var sheet = getSheet_();
  var count = Math.max(0, sheet.getLastRow() - 1); // minus the header row
  cache.put('count', String(count), 60); // cache for 60 seconds
  return json_({ count: count });
}

/* ---------- helpers ---------- */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function clean_(value, max) {
  var s = String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
  // Prevent spreadsheet formula injection (values starting with = + - @ are treated as formulas).
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional: run this once from the Apps Script editor (select "setup" > Run) to create the
 * "Signatures" sheet with headers and grant permissions before deploying.
 */
function setup() {
  getSheet_();
}
