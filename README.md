Hello! This is a little website the hyperlink team built for fun and as a love letter to
the internet.

On this website you can:

- create new threads
- reply to threads you get linked to
- subscribe to threads you get linked to

There is no global listing of threads, or any kind of global community. It's a
tool for you to use.

## How it's made

This website is server-rendered and built ontop of Cloudflare Workers. It could
be fairly easily adapted to run in any javascript server context.

It has zero run-time dependencies, and uses `typescript`, `esbuild`, and
`wrangler` in development.

This constraint wasn't adopted for any particular moral reason, but rather just
because it was a fun one.

## Working on the website

If you want to play around and maybe try extending this code here's what you'll
need:

### Environment variables

- `TOKEN_SECRET`: a secret that will be used to sign authentication tokens
- `POSTMARK_API_TOKEN`: An api token to send emails via postmark. If this isn't
  set, emails will instead be logged to the console.

### Developing Locally

First create a file called `.dev.vars` with the contents:

```
TOKEN_SECRET="SOME_RANDOM_STRING"
```

After that you should be able to run `npm i` followed by `npm run dev` to get
the local wrangler dev server up and running!

If you want to use an email service even when developing locally, set a
`POSTMARK_API_TOKEN` variable as well.

### Deploying

When deploying to cloudflare make sure to set the required environment
variables, and adjust the `wrangler.toml` to match your `account_id` and such.
