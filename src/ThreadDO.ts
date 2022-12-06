import { Env } from ".";
import { apiRouter, makeAPIClient, makeRoute } from "./api_router";
import { userDOClient } from "./UserDO";

export type ThreadEntry = {
  id: string;
  title: string;
  url: string;
  approved: boolean | null;
  date: string;
  submitter: string;
};
type Subscriber = { username: string };
type Metadata = {
  owner: string;
  title: string;
  dateCreated: string;
};

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
    handler: async (msg: { owner: string; title: string }, { state }) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (metadata) return {};

      await state.storage.put<Subscriber[]>("subscribers", [
        { username: msg.owner },
      ]);

      await state.storage.put<Metadata>("metadata", {
        owner: msg.owner,
        title: msg.title,
        dateCreated: new Date().toISOString(),
      });
      return {};
    },
  }),
  makeRoute({
    route: "update_pending_entry",
    handler: async (
      msg: { entry: string; username: string; approved: boolean },
      { state, env }
    ) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (metadata?.owner !== msg.username) return { approved: false };
      let pending_entries =
        (await state.storage.get<ThreadEntry[]>("pending_entries")) || [];
      let entryIndex = pending_entries.findIndex((f) => f.id === msg.entry);
      if (entryIndex === -1) return {};

      let subscribers =
        (await state.storage.get<Subscriber[]>("subscribers")) || [];
      let entry = pending_entries[entryIndex];

      if (msg.approved) {
        let entries = (await state.storage.get<ThreadEntry[]>("entries")) || [];
        await state.storage.put<ThreadEntry[]>("entries", [
          ...entries,
          { ...entry, approved: true },
        ]);
        let date = new Date().toISOString();
        for (let subscriber of subscribers) {
          let userDO = env.USER.get(env.USER.idFromName(subscriber.username));
          await userDOClient(userDO, "add_subscribed_thread_entry", {
            threadTitle: metadata?.title,
            date,
            title: entry.title,
            url: entry.url,
            thread: state.id.toString(),
          });
        }
      }

      await state.storage.put<ThreadEntry[]>(
        "pending_entries",
        pending_entries.filter((_, index) => index !== entryIndex)
      );

      return {};
    },
  }),
  makeRoute({
    route: "add_entry",
    handler: async (
      msg: { url: string; title: string; submitter: string; date: string },
      { state }
    ) => {
      let pending_entries =
        (await state.storage.get<ThreadEntry[]>("pending_entries")) || [];
      let metadata = await state.storage.get<Metadata>("metadata");
      if (!metadata) return {};

      let newEntries = [
        ...pending_entries,
        {
          title: msg.title,
          url: msg.url,
          date: msg.date,
          approved: null,
          submitter: msg.submitter,
          id: crypto.randomUUID(),
        },
      ];
      await state.storage.put<ThreadEntry[]>("pending_entries", newEntries);
      return { entries: newEntries };
    },
  }),
  makeRoute({
    route: "get_data",
    handler: async (msg: { username?: string }, { state }) => {
      let entries = (await state.storage.get<ThreadEntry[]>("entries")) || [];
      let pending_entries =
        (await state.storage.get<ThreadEntry[]>("pending_entries")) || [];
      let subscribed = false;
      let metadata = (await state.storage.get<Metadata>(
        "metadata"
      )) as Metadata;
      if (msg.username) {
        let subscribers =
          (await state.storage.get<Subscriber[]>("subscribers")) || [];
        subscribed = !!subscribers.find((f) => f.username === msg.username);
      }
      return { entries, subscribed, metadata, pending_entries };
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
  makeRoute({
    route: "delete",
    handler: async (msg: { username: string }, { state }) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (metadata?.owner !== msg.username) return { approved: false };
      //TODO broadcast to subscribers that things were deleted
      await state.storage.deleteAll();
      return {};
    },
  }),
];

let APIRouter = apiRouter(routes);
export const threadDOClient = makeAPIClient<typeof routes>();
