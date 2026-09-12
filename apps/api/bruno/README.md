# ezRepo API Bruno Collection

This collection contains version-controlled requests for manually verifying the
ezRepo API. Open `apps/api/bruno` as a collection in [Bruno](https://www.usebruno.com/).

## Development environment

Select the `DEV` environment. It targets `http://localhost:3001` by default.
Adjust `host` for a different local port or a deployed instance.

The environment declares `username`, `password`, and `token` as Bruno secret
variables. Add the credentials in Bruno's environment editor; do not place them
in a committed `.bru` file. Run `auth/sign in` to populate the secret `token`
variable before calling protected endpoints.

## Current manual check

Start the API with the required values from `.env.example`, then run
`health/get health status`. It must return HTTP `200` with an `api` value of
`"ok"`, a `database` value of `"ok"`, and the persisted provider sync state:

```json
{
  "api": "ok",
  "database": "ok",
  "providers": [],
  "status": "ok"
}
```

Add a request to the relevant module folder whenever an endpoint is introduced.
