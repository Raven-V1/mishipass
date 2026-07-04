# Hotfix: Login Down — Toast Null-Guard

Date: 2026-07-03

## Root Cause

Run A's toast refactor (commit ded184e) added toast element references and an
event listener at the top of the inlined dashboard script:

```js
var mpToastClose = document.getElementById("mp-toast-close");
// ...
mpToastClose.addEventListener("click", function(){ ... });
```

The toast markup (`<div id="mp-toast">...`) was placed AFTER the `</script>` tag
in the HTML. When the browser executes the script, the toast elements have not
yet been parsed into the DOM, so `mpToastClose` is null. Calling
`.addEventListener` on null throws a TypeError, halting the entire inlined script
before the login form handler can attach.

Result: login form submit does nothing; production login is dead.

## Fix

Two null-guard edits in `apps/worker/src/pages/dashboard.ts`:

**Edit A** — Guard the close listener:
```js
// Before:
mpToastClose.addEventListener("click",function(){mpToast.classList.add("hidden")});
// After:
if(mpToastClose){mpToastClose.addEventListener("click",function(){mpToast.classList.add("hidden")})}
```

**Edit B** — Guard showToast:
```js
// Before:
function showToast(msg,type){mpToastMsg.textContent=msg;...}
// After:
function showToast(msg,type){if(!mpToast||!mpToastMsg){return}mpToastMsg.textContent=msg;...}
```

## getElementById Audit

All element IDs referenced by `document.getElementById` in the dashboard script:

| Element ID | In DOM when script runs? | Null-guarded? |
|---|---|---|
| auth-section | Yes (above script) | N/A |
| dashboard-section | Yes | N/A |
| cat-list | Yes | N/A |
| contact-list | Yes | N/A |
| login-form | Yes | N/A |
| register-form | Yes | N/A |
| create-cat-form | Yes | N/A |
| logout-btn | Yes | N/A |
| login-error | Yes | N/A |
| register-error | Yes | N/A |
| register-success | Yes | N/A |
| mp-toast | No (below script) | Yes (guarded in showToast) |
| mp-toast-msg | No (below script) | Yes (guarded in showToast) |
| mp-toast-close | No (below script) | Yes (if-guarded) |
| language-select | Yes | N/A |
| language-save-btn | Yes | N/A |
| language-status | Yes | N/A |
| breed-card-grid | Yes | N/A |
| all-breed-grid | Yes | N/A |
| cat-breed | Yes | N/A |
| breed-search | Yes | N/A |
| breed-summary | Yes | N/A |
| breed-other-wrap | Yes | N/A |
| cat-breed-other | Yes | N/A |
| show-more-breeds | Yes | N/A |
| color-swatch-grid | Yes | N/A |
| cat-color | Yes | N/A |
| color-summary | Yes | N/A |
| color-other-wrap | Yes | N/A |
| cat-color-other | Yes | N/A |
| cat-name | Yes | N/A |
| cat-country | Yes | N/A |
| cat-sex | Yes | N/A |
| cat-birthday | Yes | N/A |
| cat-markings-note | Yes | N/A |
| board-link | Yes | N/A |
| login-email | Yes | N/A |
| login-password | Yes | N/A |
| register-email | Yes | N/A |
| register-password | Yes | N/A |

Only the three toast elements are below the script. All three are now
null-guarded. No other bare `.addEventListener` call references an element
that could be null.
