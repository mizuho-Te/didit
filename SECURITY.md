# Security policy

## Supported versions

The v0.2 source preview is public on [GitHub](https://github.com/mizuho-Te/didit), but there is no npm release. Only the current development code is being maintained; no production security-support guarantee is offered for the v0.2 preview.

## Reporting a vulnerability

Do not disclose vulnerabilities, exploit details, credentials, or private repository contents in a public issue or pull request.

GitHub private vulnerability reporting is enabled. Use [Report a vulnerability](https://github.com/mizuho-Te/didit/security/advisories/new) to submit a private report to the repository maintainers.

Include the affected version or commit, a minimal reproduction, impact, and any suggested mitigation. Remove secrets and unrelated personal information. No response-time or remediation guarantee is offered for this preview.

## Security boundaries

The CLI performs local static analysis without network access. Optional test and setup commands execute arbitrary code with the invoking user's permissions, not in a security sandbox. Those commands may themselves access the network or secrets. Review commands, configuration, and repository contents before enabling execution. Detached worktrees isolate revisions, not permissions. Do not run untrusted pull-request code in a privileged checkout.

CI, CodeQL, and dependency-update workflows are development services, not assurances that findings are absent. The presence of these workflow files does not establish that hosted scans have run or that a repository has been configured for code scanning.
