# Reddit draft

Do not post until the chosen community's current promotion and disclosure rules have been reviewed. This is one adaptable draft, not permission to cross-post. Add the verified repository URL and disclose the author's relationship to the project in the final post. Never invent personal experience.

## Title

A local preview for reviewing skipped tests and weakened assertions in Git diffs

## Personal experience

<!-- TODO: 実体験を書く -->

## Body

didit is an MIT CLI project for reviewing changes that make checks easier to pass: adding `.skip`, weakening an assertion, suppressing errors, or relaxing a test/CI configuration. It has TS/JS and Python patterns plus configuration checks, and can optionally run tests on the before/after states.

The attached GIF is synthetic: a tiny Node harness runs actual assertions and emits Vitest-style counts. It is a demonstration of the rules, not a real user incident or evidence that a particular agent is dishonest.

The tool cannot tell whether a change is justified. It uses text/diff heuristics, records reasoned suppressions, and surfaces its own configuration changes. Test moves and complicated syntax can produce false positives. Counts depend on what the command actually selected and what the parser can read.

Static checks are local, with no LLM or telemetry. Optional test/setup commands run with your permissions and can communicate externally. Shared dependency links are not isolation.

This is an unpublished preview. Build and install the local tarball using the README, then use `npx --no-install didit`; do not fetch the provisional name from npm. Hosted OS verification and real agent-product integration must be judged from actual evidence, not the presence of config files.

For this community: TODO choose one relevant question about legitimate skips, Python marker conventions, or TS assertion changes. Minimal sanitized examples of false positives would help refine the scope.

TODO: verified repository URL, appropriate community, relationship disclosure, and confirmation of current posting rules.
