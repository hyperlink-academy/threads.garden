import { verifyRequest } from "../auth";
import { h, html } from "../html";
import { Route } from "../router";
import { threadDOClient } from "../ThreadDO";
import { four04, redirect } from "../utils";
import { SubmitLinkForm } from "./home";

export const thread_routes: Route[] = [
  {
    method: "GET",
    route: "/t/:thread",
    handler: async (request, { env, routeParams }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      let data = await threadDOClient(threadStub, "get_data", {
        username: auth?.username,
      });
      let action = data.subscribed ? "unsubscribe" : "subscribe";
      let pendingReplies = data.entries.filter((f) => f.approved === null);

      return new Response(
        html(
          {
            token: auth,
            head: h("title", "t: " + data.metadata.title),
          },
          [
            h("h2", data.metadata.title),
            h(
              "ul",
              data.entries
                .filter((f) => f.approved === true)
                .sort((a, b) => (a.date > b.date ? 1 : -1))
                .map((e) => {
                  return h("li", [h("a", { href: e.url }, e.title)]);
                })
            ),
            auth?.username === data.metadata.owner && pendingReplies.length > 0
              ? h("div", [
                  h("h3", "Pending Replies"),
                  h(
                    "ul",
                    pendingReplies.map((e) =>
                      h(
                        "li",
                        h(
                          "div",
                          {
                            style: `display: flex; flex-direction: row; gap: 4px;`,
                          },
                          [
                            h("a", { href: e.url }, e.title),
                            h(
                              "form",
                              {
                                action: `/t/${routeParams.thread}/entry/${e.id}`,
                                method: "POST",
                              },
                              [
                                h(
                                  "button",
                                  { name: "approve", value: "approve" },
                                  "approve"
                                ),
                                h(
                                  "button",
                                  { name: "approve", value: "reject" },
                                  "reject"
                                ),
                              ]
                            ),
                          ]
                        )
                      )
                    )
                  ),
                ])
              : null,
            auth
              ? h(
                  "form",
                  {
                    action: `/t/${routeParams.thread}/${action}`,
                    method: data.subscribed ? "DELETE" : "POST",
                  },
                  h(
                    "button",

                    data.subscribed ? "unsubscribe" : "subscribe"
                  )
                )
              : null,
            !auth
              ? null
              : SubmitLinkForm({
                  action: `/t/${routeParams.thread}/reply`,
                  buttonText: "reply",
                }),
          ]
        ),
        {
          headers: { "Content-type": "text/html" },
        }
      );
    },
  },
  {
    method: ["POST"],
    route: "/t/:thread/entry/:entry",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread || !routeParams.entry) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      if (!auth) return redirect(`/t/${routeParams.thread}`);
      let data = await request.formData();
      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      console.log(...data.entries());

      await threadDOClient(threadStub, "update_entry", {
        entry: routeParams.entry,
        approved: data.get("approve") === "approve",
        username: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
  {
    method: ["POST", "DELETE"],
    route: "/t/:thread/subscribe",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      if (request.method === "DELETE")
        await threadDOClient(threadStub, "unsubscribe", {
          username: auth.username,
        });
      else
        await threadDOClient(threadStub, "subscribe", {
          username: auth.username,
        });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
  {
    method: "POST",
    route: "/t/:thread/reply",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      let formData = await request.formData();
      let url = formData.get("url");
      let title = formData.get("title");
      if (!url || !title) return new Response("error, no url");
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      await threadDOClient(threadStub, "add_entry", {
        date: new Date().toISOString(),
        url: url.toString(),
        title: title.toString(),
        submitter: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
];
