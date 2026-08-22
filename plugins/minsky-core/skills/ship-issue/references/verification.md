# Verification: live checkpoint per slice

A slice is not done when it typechecks. It is done when the real app shows the behavior. Green tests prove logic; a live run proves the wiring.

## Isolate the riskiest unknown earliest
Stage the first checkpoint so it answers the scariest question alone. A synthetic stub (a handler that emits a timer tick, no real data source) proves the transport and the sink before any infra is involved. If the transport has a quirk (SSR, CORS, buffering, a proxy), you learn it against five lines, not after building the whole feature on top of it.

## Drive the app, do not reason blind
Run the daemons and the UI. Trigger the behavior with the smallest real input. Prefer the `run` and `verify` skills, or a Playwright drive, over guessing. One measurement beats three reasoning round-trips. For a visual or layout question, measure the DOM (`getBoundingClientRect`, computed styles), do not eyeball.

## Probe ladder when a hop goes silent
Name the hops and check each in order; report which one went dark. That isolates the fault in one pass:
- server log line (did the request reach the handler?)
- network tab (is the stream open, or closed and errored?)
- queue or stream (was the job added, the message published?)
- store (did the row land?)
- sink (did the UI render?)

## ENV failure is not LOGIC failure
A test or run that fails because Postgres, Valkey, or the browser harness is absent is an environment gap, not a bug. Say so explicitly and separately. Do not conclude the code is broken from an infra-less run, and do not claim success from a run that silently skipped the body.

## Have the user run when they own the env
When the user holds the DB credentials, the session, or the browser, hand them the exact commands and the success signal, then wait. Suggest `! <command>` for interactive steps (logins, OTP) so the output lands in the session.

## The closing runbook (mandatory, every session)
Every ship-issue session ends with a runbook: the exact steps to drive what THIS session built and observe it working. It is the hand-off contract. The user runs it, sees the behavior, and reports errors back with real output. Never skip it, never hand-wave it as "just start the app".

Split the work by who can prove what:
- **You prove headlessly, up front, and mark PROVEN.** Whatever needs no human-held secret or GUI: the endpoint is in the live spec, an unauth call is rejected, the integration test is green, a CLI/query read seam returns. Run these yourself and report the result so the user does not re-run settled ground.
- **The user runs the residue**: the human-gated path you cannot drive: a browser click, an OTP/login, a device permission, a real payment sandbox. This is what the runbook is for.

A good runbook step carries three things: the **command or action**, the **success signal** (what they should see), and any **gotcha** (where a dev code is logged, which port, what must already be running). End with a **read-back** step that confirms the effect actually landed (the row, the event, the file), not just that the UI looked happy.

Shape:
1. Prerequisites: which daemons/ports/containers must be up (note which are already up).
2. Numbered steps, each: action -> expected signal. Interactive ones via `! <command>` or a URL to open.
3. Where any dev secret surfaces (dev OTP in the api console, a seed login, a master code).
4. Final read-back: the staff/query/CLI seam that shows the persisted effect.
5. One line on what to report if a step fails (which step, the error text).

Keep it copy-pasteable and specific to this session's diff. A generic "run the app and click around" is not a runbook.
