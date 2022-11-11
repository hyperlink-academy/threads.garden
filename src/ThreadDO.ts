import { Env } from ".";
import { apiRouter, makeAPIClient, makeRoute } from "./api_router";

type ThreadEntry = {
  title: string;
  url: string;
  submitter: string;
};
let routes = [
  makeRoute({
    route: "init",
    handler: async (
      msg: { owner: string; url: string; title: string },
      { state }
    ) => {
      let owner = await state.storage.get<string>("owner");
      if (owner) return {};
      await state.storage.put<string>("owner", msg.owner);
      let threads = (await state.storage.get<ThreadEntry[]>("entries")) || [];
      await state.storage.put<ThreadEntry[]>("entries", [
        ...threads,
        { title: msg.title, url: msg.url, submitter: msg.owner },
      ]);
      return {};
    },
  }),
  makeRoute({
    route: "get_entries",
    handler: async (_msg: {}, { state }) => {
      let threads = (await state.storage.get<ThreadEntry[]>("entries")) || [];
      return { threads };
    },
  }),
];

export class ThreadDO implements DurableObject {
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
    return new Response("thread thing");
  }
}

let APIRouter = apiRouter(routes);
export const threadDOClient = makeAPIClient<typeof routes>();
