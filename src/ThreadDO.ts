import { Env } from ".";
import { apiRouter, makeAPIClient, makeRoute } from "./api_router";
import { userDOClient } from "./UserDO";

type ThreadEntry = {
  id: string;
  title: string;
  url: string;
  approved: boolean | null;
  date: string;
  submitter: string;
};
type Subscriber = { username: string };

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
      let id = crypto.randomUUID();
      await state.storage.put<ThreadEntry[]>("entries", [
        ...threads,
        {
          title: msg.title,
          url: msg.url,
          date: new Date().toISOString(),
          submitter: msg.owner,
          id,
          approved: true,
        },
      ]);
      return {};
    },
  }),
  makeRoute({
    route: "update_entry",
    handler: async (
      msg: { entry: string; username: string; approved: boolean },
      { state }
    ) => {
      let owner = await state.storage.get<string>("owner");
      if (owner !== msg.username) return { approved: false };
      let entries = (await state.storage.get<ThreadEntry[]>("entries")) || [];
      let entryIndex = entries.findIndex((f) => f.id === msg.entry);
      if (entryIndex === -1) return {};
      console.log(msg.approved);
      entries[entryIndex] = { ...entries[entryIndex], approved: msg.approved };
      await state.storage.put<ThreadEntry[]>("entries", entries);
      return {};
    },
  }),
  makeRoute({
    route: "add_entry",
    handler: async (
      msg: { url: string; title: string; submitter: string; date: string },
      { state, env }
    ) => {
      let entries = (await state.storage.get<ThreadEntry[]>("entries")) || [];

      let subscribers =
        (await state.storage.get<Subscriber[]>("subscribers")) || [];
      let newEntries = [
        ...entries,
        {
          title: msg.title,
          url: msg.url,
          date: msg.date,
          approved: null,
          submitter: msg.submitter,
          id: crypto.randomUUID(),
        },
      ];
      await state.storage.put<ThreadEntry[]>("entries", newEntries);
      let date = new Date().toISOString();
      for (let subscriber of subscribers) {
        let userDO = env.USER.get(env.USER.idFromName(subscriber.username));
        await userDOClient(userDO, "add_subscribed_thread_entry", {
          threadTitle: entries[0].title,
          threadURL: entries[0].url,
          date,
          title: msg.title,
          url: msg.url,
          thread: state.id.toString(),
        });
      }
      return { entries: newEntries };
    },
  }),
  makeRoute({
    route: "get_data",
    handler: async (msg: { username?: string }, { state }) => {
      let entries = (await state.storage.get<ThreadEntry[]>("entries")) || [];
      let subscribed = false;
      let owner = (await state.storage.get<"string">("owner")) as string;
      if (msg.username) {
        let subscribers =
          (await state.storage.get<Subscriber[]>("subscribers")) || [];
        subscribed = !!subscribers.find((f) => f.username === msg.username);
      }
      return { entries, subscribed, owner };
    },
  }),
  makeRoute({
    route: "subscribe",
    handler: async (msg: { username: string }, { state }) => {
      let subscribers =
        (await state.storage.get<Subscriber[]>("subscribers")) || [];

      if (!subscribers.find((f) => f.username === msg.username)) {
        await state.storage.put<Subscriber[]>("subscribers", [
          ...subscribers,
          { username: msg.username },
        ]);
      }
      return {};
    },
  }),
  makeRoute({
    route: "unsubscribe",
    handler: async (msg: { username: string }, { state }) => {
      let subscribers =
        (await state.storage.get<Subscriber[]>("subscribers")) || [];

      if (subscribers.find((f) => f.username === msg.username)) {
        await state.storage.put<Subscriber[]>(
          "subscribers",
          subscribers.filter((f) => f.username !== msg.username)
        );
      }
      return {};
    },
  }),
];

let APIRouter = apiRouter(routes);
export const threadDOClient = makeAPIClient<typeof routes>();
