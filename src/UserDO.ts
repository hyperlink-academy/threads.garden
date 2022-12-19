import { Env } from ".";
import { apiRouter, makeAPIClient, makeRoute } from "./api_router";
import { sendEmail } from "./email";
import { h } from "./html";
import { threadDOClient } from "./ThreadDO";

type LoginToken = { ts: number; token: string };
type Thread = {
  id: string;
  dateCreated: string;
  title: string;
};
type InboxEntry = {
  entryID: string;
  date: string;
  thread: string;
  threadTitle: string;
  url: string;
  title: string;
};

type Subscriptions = {
  threadID: string;
  threadTitle: string;
  dateCreated: string;
};

type Metadata = { owner: string; display_name?: string; homepage?: string };

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
  async alarm() {
    let inbox = (await this.state.storage.get<InboxEntry[]>("inbox")) || [];
    let metadata = await this.state.storage.get<Metadata>("metadata");
    if (metadata && inbox.length > 0) {
      let entriesByThreadTitle = inbox.reduce((acc, i) => {
        if (!acc[i.thread]) acc[i.thread] = [i];
        else acc[i.thread] = [...acc[i.thread], i];
        return acc;
      }, {} as { [k: string]: InboxEntry[] });
      await sendEmail(
        metadata.owner,
        `threads.garden: ${inbox.length} new thread ${
          inbox.length > 1 ? "replies" : "reply"
        }`,
        h(
          "ul",
          Object.values(entriesByThreadTitle).map((thread) => {
            return h("li", [
              h(
                "a",
                { href: `https://threads.garden/t/${thread[0].thread}` },
                thread[0].threadTitle
              ),
              h(
                "ul",
                thread.map((i) => h("li", h("a", { href: i.url }, i.title)))
              ),
            ]);
          })
        )(),
        this.env.POSTMARK_API_TOKEN
      );
      await this.state.storage.put("inbox", []);
    }
    await this.state.storage.setAlarm(getNextEmailTime());
  }
}

let routes = [
  makeRoute({
    route: "remove_subscribed_thread_entry",
    handler: async (
      msg: {
        entryID: string;
      },
      { state }
    ) => {
      let inbox = (await state.storage.get<InboxEntry[]>("inbox")) || [];
      await state.storage.put<InboxEntry[]>(
        "inbox",
        inbox.filter((f) => f.thread !== msg.entryID)
      );
      return {};
    },
  }),
  makeRoute({
    route: "add_subscribed_thread_entry",
    handler: async (
      msg: {
        entryID: string;
        date: string;
        title: string;
        threadTitle: string;
        url: string;
        thread: string;
      },
      { state }
    ) => {
      let inbox = (await state.storage.get<InboxEntry[]>("inbox")) || [];
      await state.storage.put<InboxEntry[]>("inbox", [...inbox, msg]);
      let alarm = await state.storage.getAlarm();
      if (!alarm) {
        let date = getNextEmailTime();
        await state.storage.setAlarm(date);
      }
      return {};
    },
  }),
  makeRoute({
    route: "verify_login_token",
    handler: async (msg: { token: string; owner: string }, { state }) => {
      let data = await state.storage.get<LoginToken>(`login-token`);
      if (!data) return { valid: false };

      if (data.token !== msg.token || Date.now() - data.ts > 1000 * 60 * 30)
        return { valid: false };
      state.storage.delete("login-token");
      let metadata = await state.storage.get<Metadata>("metadata");
      state.storage.put<Metadata>("metadata", {
        ...metadata,
        owner: msg.owner,
      });
      return { valid: true, metadata };
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
  makeRoute({
    route: "add_subscription",
    handler: async (
      msg: {
        username: string;
        threadID: string;
        threadTitle: string;
        dateCreated: string;
      },
      { state }
    ) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (!metadata || metadata.owner !== msg.username)
        return { error: "no metadata or wrong user" };
      let subscriptions =
        (await state.storage.get<Subscriptions[]>("subscriptions")) || [];
      await state.storage.put<Subscriptions[]>("subscriptions", [
        ...subscriptions,
        {
          threadTitle: msg.threadTitle,
          threadID: msg.threadID,
          dateCreated: msg.dateCreated,
        },
      ]);
      return {};
    },
  }),
  makeRoute({
    route: "update_user_data",
    handler: async (
      msg: { display_name?: string; homepage?: string; username: string },
      { state }
    ) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (!metadata || metadata.owner !== msg.username)
        return { error: "no metadata or wrong user" };
      await state.storage.put<Metadata>("metadata", {
        ...metadata,
        display_name: msg.display_name,
        homepage: msg.homepage,
      });
      return {};
    },
  }),
  makeRoute({
    route: "get_data",
    handler: async (_msg: {}, { state }) => {
      let threads = (await state.storage.get<Thread[]>("threads")) || [];
      let nextDO = await state.storage.getAlarm();
      let inbox = (await state.storage.get<InboxEntry[]>("inbox")) || [];
      let metadata = await state.storage.get<Metadata>("metadata");
      let subscriptions =
        (await state.storage.get<Subscriptions[]>("subscriptions")) || [];
      return {
        threads,
        nextEmail: nextDO,
        inbox,
        metadata,
        subscriptions,
      };
    },
  }),
  makeRoute({
    route: "create_thread",
    handler: async (msg: { title: string }, { env, state }) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (!metadata) {
        console.log("Error: called create_thread before authorization");
        return { error: "Called before initialization" };
      }
      let newThreadID = env.THREAD.newUniqueId();
      let stub = env.THREAD.get(newThreadID);
      await threadDOClient(stub, "init", {
        owner: metadata.owner,
        title: msg.title,
      });

      // Save that thread id somewhere along w/ title and ID
      let threads = (await state.storage.get<Thread[]>("threads")) || [];
      await state.storage.put<Thread[]>("threads", [
        {
          id: newThreadID.toString(),
          dateCreated: new Date().toISOString(),
          title: msg.title,
        },
        ...threads,
      ]);

      return { threadID: newThreadID.toString() };
    },
  }),

  makeRoute({
    route: "delete_thread",
    handler: async (
      msg: { username: string; threadID: string },
      { state, env }
    ) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (metadata?.owner !== msg.username) return { approved: false };

      let threads = (await state.storage.get<Thread[]>("threads")) || [];
      let thread = threads.find((t) => t.id === msg.threadID);
      if (!thread) return {};

      let stub = env.THREAD.get(env.THREAD.idFromString(thread.id));
      await threadDOClient(stub, "delete", {
        username: metadata.owner,
      });
      await state.storage.put<Thread[]>(
        "threads",
        threads.filter((f) => f.id !== msg.threadID)
      );

      return {};
    },
  }),
];

function getNextEmailTime() {
  let date = new Date();
  date.setTime(date.getTime() + 30 * 60 * 1000);
  let hour = date.getUTCHours();
  if (hour < 15) {
    date.setTime(date.getTime() + (15 - hour) * 60 * 60 * 1000);
    date.setMinutes(0);
  } else {
    date.setTime(date.getTime() + (hour - 15 + 12) * 60 * 60 * 1000);
    date.setMinutes(0);
  }
  return date;
}

let APIRouter = apiRouter(routes);
export const userDOClient = makeAPIClient<typeof routes>();
