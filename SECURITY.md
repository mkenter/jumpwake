# Security

## Security boundaries

Jumpwake is a client-side application. Imported charts, vessel configurations,
and passage data remain on the user's device unless the user explicitly shares a
passage link.

- Treat imported files, URL parameters, and browser storage as untrusted input.
- Validate input before persisting or using it, and handle parsing errors safely.
- Preserve file-size and computational resource limits.
- Never render imported content as executable HTML.
- Do not introduce external transmission of user data, telemetry, or third-party
  services without explicit approval.
- Never commit credentials, API keys, or secrets.
- Review new dependencies for necessity and security risk.
- Handle malformed or corrupted persisted data safely.

## Reporting vulnerabilities

If GitHub private vulnerability reporting is available, use it to report
vulnerabilities privately. Avoid posting exploitable details in public issues or
pull requests.
