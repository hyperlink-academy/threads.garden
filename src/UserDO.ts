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
  date: string;
  thread: string;
  threadTitle: string;
  threadURL: string;
  url: string;
  title: string;
};

type Metadata = { owner: string };

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
        acc[i.threadTitle] = [...acc[i.threadTitle], i];
        return acc;
      }, {} as { [k: string]: InboxEntry[] });
      await sendEmail(
        metadata.owner,
        `Your threads have ${inbox.length} new responses`,
        h(
          "ul",
          Object.values(entriesByThreadTitle).map((thread) => {
            return h("li", [
              h(
                "a",
                { href: `https://threads.garden/t/${thread[0].threadURL}` },
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
    }
    await this.state.storage.setAlarm(getNextEmailTime());
  }
}

let routes = [
  makeRoute({
    route: "add_subscribed_thread_entry",
    handler: async (
      msg: {
        date: string;
        title: string;
        threadTitle: string;
        threadURL: string;
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
        console.log(date.toISOString());
        console.log(await state.storage.setAlarm(date));
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
      state.storage.put<Metadata>("metadata", { owner: msg.owner });
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

  makeRoute({
    route: "get_data",
    handler: async (_msg: {}, { state }) => {
      let threads = (await state.storage.get<Thread[]>("threads")) || [];
      let nextDO = await state.storage.getAlarm();
      return { threads, nextEmail: nextDO };
    },
  }),
  makeRoute({
    route: "create_thread",
    handler: async (msg: { url: string; title: string }, { env, state }) => {
      let metadata = await state.storage.get<Metadata>("metadata");
      if (!metadata) {
        console.log("Error: called create_thread before authorization");
        return { error: "Called before initialization" };
      }
      let newThreadID = env.THREAD.newUniqueId();
      let stub = env.THREAD.get(newThreadID);
      await threadDOClient(stub, "init", {
        owner: metadata.owner,
        url: msg.url,
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