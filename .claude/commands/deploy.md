# /project:deploy

Deploy the application to the target environment.

## Steps

1. Confirm the target environment from `$ARGUMENTS` (e.g. `staging`, `production`).
2. Run the test suite: `npm test`.
3. Run the build: `npm run build`.
4. Deploy using the appropriate command:
   - **staging**: `npm run deploy:staging`
   - **production**: `npm run deploy:prod`
5. Verify the deployment by hitting the health-check endpoint.
6. Report success or failure with relevant logs.

## Arguments

- `$ARGUMENTS` — target environment name. Defaults to `staging` if not provided.

## Safety

- Never deploy to production without explicit confirmation.
- Always deploy to staging first.
