# Security policy

## Supported versions

There is no public release yet. Only the current development code is being maintained; no production security-support guarantee is offered for the v0.2 preview.

## Reporting a vulnerability

Do not disclose vulnerabilities, exploit details, credentials, or private repository contents in a public issue or pull request.

A verified private reporting contact has not yet been supplied. Before public release, the maintainer must enable GitHub private vulnerability reporting on the final repository or publish a monitored private security contact here. No such channel is claimed to exist today. Until then, ask the maintainer through an already-established private channel for a safe reporting route, without including sensitive details in a public request.

Once a private route is available, include the affected version or commit, a minimal reproduction, impact, and any suggested mitigation. Remove secrets and unrelated personal information. Response timelines will be published when maintainers and the reporting channel are established.

## Security boundaries

The CLI performs local static analysis without network access. Optional test and setup commands execute arbitrary code with the invoking user's permissions, not in a security sandbox. Those commands may themselves access the network or secrets. Review commands, configuration, and repository contents before enabling execution. Detached worktrees isolate revisions, not permissions. Do not run untrusted pull-request code in a privileged checkout.

CI, CodeQL, and dependency-update workflows are development services, not assurances that findings are absent. The presence of these workflow files does not establish that hosted scans have run or that a repository has been configured for code scanning.
