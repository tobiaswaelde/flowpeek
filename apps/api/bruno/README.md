# Flowpeek API Bruno Collection

This collection contains version-controlled requests for manually verifying the
Flowpeek API. Open `apps/api/bruno` as a collection in [Bruno](https://www.usebruno.com/).

## Development environment

Select the `DEV` environment. It targets `http://localhost:3001` by default.
Adjust `host` for a different local port or a deployed instance.

The environment declares `username`, `password`, and `token` as Bruno secret
variables. Add their values in Bruno's environment editor; do not place them
in a committed `.bru` file. The variables are reserved for the authentication
requests that will be added with the auth module.

## Current manual check

Start the API with the required values from `.env.example`, then run
`health/get health status`. It must return HTTP `200` and:

```json
{
  "status": "ok"
}
```

Add a request to the relevant module folder whenever an endpoint is introduced.
Protected requests must inherit bearer authentication only after the auth module
adds a sign-in request that populates `token`.
