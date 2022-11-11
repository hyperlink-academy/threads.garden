import { h, html } from "../html";
import { Route } from "../router";
import { threadDOClient } from "../ThreadDO";

export const thread_route: Route = {
  method: "GET",
  route: "/t/:thread",
  handler: async (_request, { env, routeParams }) => {
    if (!routeParams.thread) return new Response("404 yo", { status: 404 });
    let threadStub = env.THREAD.get(
      env.THREAD.idFromString(routeParams.thread)
    );
    let entries = await threadDOClient(threadStub, "get_entries", {});
    return new Response(
      html(
        [h("title", "thread")],
        [
          h("h1", "a thread!"),
          h(
            "ul",
            entries.threads.map((e) =>
              h("li", h("a", { href: e.url }, e.title))
            )
          ),
        ]
      ),
      {
        headers: { "Content-type": "text/html" },
      }
    );
  },
};
