import { verifyRequest } from "../auth";
import { h, html } from "../html";
import { Route } from "../router";
import { threadDOClient } from "../ThreadDO";
import { four04, redirect } from "../utils";

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
            auth
              ? h(
                  "form",
                  {
                    style: "margin: 16px 0;",
                    action: `/t/${routeParams.thread}/${action}`,
                    method: data.subscribed ? "DELETE" : "POST",
                  },
                  h(
                    "button",

                    data.subscribed ? "unsubscribe" : "subscribe"
                  )
                )
              : null,
            auth?.username === data.metadata.owner && pendingReplies.length > 0
              ? h("div", { style: "margin-bottom: 32px;" }, [
                  h("h3", "Pending Replies"),
                  h(
                    "ul",
                    { style: "line-height: 2em;" },
                    pendingReplies.map((e) =>
                      h(
                        "li",
                        h(
                          "div",
                          {
                            style: `display: flex; flex-direction: row; gap: 4px; justify-content: space-between;`,
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
                  h("hr", {
                    style: "border: 1px green dashed; margin: 64px 0;",
                  }),
                ])
              : null,
            h(
              "ul",
              {
                style:
                  "line-height: 2em; list-style: none; padding: 0 0 32px 0;",
              },
              data.entries
                .filter((f) => f.approved === true)
                .sort((a, b) => (a.date > b.date ? 1 : -1))
                .map((e, index) => {
                  return h("div", [
                    h(
                      "li",
                      {
                        style: `background: #f6ef95; padding: 16px; border-radius: 16px; ${
                          index % 2 == 0
                            ? "text-align: left; width: calc(100% - 64px);"
                            : "text-align: right; width: calc(100% - 64px); margin-left: 32px;"
                        }`,
                      },
                      [h("a", { href: e.url }, e.title)]
                    ),
                    h("div", {
                      style: `padding: 64px 0; margin: -32px -16px; ${
                        index % 2 == 0
                          ? "border-left: 2px dashed darkgreen; border-radius: 12px 0px 0px 64px;"
                          : "border-right: 2px dashed darkgreen; border-radius: 0 12px 64px 0;"
                      }`,
                    }),
                  ]);
                })
            ),
            !auth
              ? SubmitNonAuth({ threadcount: data.entries.length })
              : SubmitLinkForm({
                  action: `/t/${routeParams.thread}/reply`,
                  buttonText: "reply",
                  threadcount: data.entries.length,
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

const SubmitLinkForm = (props: {
  action: string;
  buttonText: string;
  threadcount: number;
}) =>
  h(
    "form",
    {
      style: `background: #d3ea94; padding: 16px; border-radius: 16px; margin-top: -32px; width: calc(100% - 64px); ${
        props.threadcount % 2 == 0 ? "" : "margin-left: 32px;"
      }`,
      method: "POST",
      action: props.action,
    },
    [
      h(
        "p",
        { style: "margin: 0 0 12px 0; font-style: italic;" },
        "add a reply?"
      ),
      h("label", { for: "title" }),
      h("input", {
        placeholder: "Thread Title",
        required: true,
        id: "title",
        name: "title",
        type: "text",
        maxlength: "140",
      }),
      h("label", { for: "url" }),
      h("input", {
        placeholder: "Thread URL",
        required: true,
        id: "url",
        name: "url",
        type: "url",
      }),
      h("button", props.buttonText),
    ]
  );

const SubmitNonAuth = (props: { threadcount: number }) =>
  h(
    "div",
    {
      style: `background: #d3ea94; padding: 16px; border-radius: 16px; margin-top: -32px; width: calc(100% - 64px); ${
        props.threadcount % 2 == 0 ? "" : "margin-left: 32px;"
      }`,
    },
    [
      h(
        "p",
        { style: "margin: 4px 0 8px 0; font-style: italic;" },
        "please log in to reply to this thread!"
      ),
    ]
  );
