import { Env } from ".";
import { apiRouter, makeAPIClient, makeRoute } from "./api_router";

type LoginToken = { ts: number; token: string };
let routes = [
  makeRoute({
    route: "verify_login_token",
    handler: async (msg: { token: string }, { state }) => {
      let data = await state.storage.get<LoginToken>(`login-token`);
      if (!data) return { valid: false };

      if (data.token !== msg.token || Date.now() - data.ts > 1000 * 60 * 30)
        return { valid: false };
      state.storage.delete("login-token");
      return { valid: true };
    },
  }),
  makeRoute({
    route: "generateLoginToken",
    handler: async (_msg: {}, { state }) => {
      let token = crypto.randomUUID();
      await state.storage.put<LoginToken>(`login-token`, {
        token,
        ts: Date.now(),
      });
      return { token };
    },
  }),
];

export class UserDO implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}
  async fetch(request: Request) {
    let url = new URL(request.url);
    if (url.pathname.startsWith("/api"))
      return APIRouter(request, url.pathname.slice(5), {
        env: this.env,
        state: this.state,
      });
    return new Response("user thing");
  }
}

let APIRouter = apiRouter(routes);
export const userDOClient = makeAPIClient<typeof routes>();
