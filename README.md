Hello! This is a little app I am building for fun. 

With that in mind what does it absolutely need to do? I need to do accounts.
With a basic amount of verification, so that we can reasonably send emails.

What is the *core* interaction here? Replying w/ a post, and receiving emails,
AND moderation by default. 

How do you make moderation feel nice? Forget about it. It's basically entirely
to prevent spam.


## Actions 

1. Make an account

2. Create a new thread

3. Reply to a thread

4. Moderate a thread
- See a list of unmoderated replies
- Approve or deny
- 

5. Subscribing to a thread
- Have an account w/ a verified email
- Get an email once a day w/ threads that have had new replies in the time since
    last email



## Database

### accounts
- Username
- hashed password
- Subscribed threads
- Email 
  - (verified or not)

### Threads
- Owner account (ref) (indexed)
- ID (string)
- Items
  - Approved (boolean)
  - URL (string)

## Development flow

Q: Where should I store data? Could probably swing it to be Durable Objects,
which makes deployment simpler than otherwise. The notion there would be every
account gets a DO, and every Thread gets a DO. Then we aggressively cache
responses that are pure reads.

Alternatively could build on top of sqlite, maybe using fly.io? I guess could
just run it on our own and assume that it's gonna deploy as simply as
possible...

I think Cloudflare might be the simplest, unfortunately. 

Q: What front-end frame-work should I use?
- /
- /u/:user
- /u/:user/t/:threads
- /u/:user/settings

It's kinda a fun constraint..., but maybe would be too large  pain? It is kinda
fun... Just a zero-dependency application. Fuck it, let's try it.

## Questions

- Where should I store user data?? I could put it into a signed token. OR I
    could put it into the DO and retrieve it.
