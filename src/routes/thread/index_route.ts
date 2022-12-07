import { verifyRequest } from "auth";
import { h, html } from "html";
import { Route } from "router";
import { threadDOClient, ThreadEntry } from "ThreadDO";
import { four04 } from "utils";

export const index_route: Route = {
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
    let isOwner = auth?.username === data.metadata.owner;

    return new Response(
      html(
        {
          token: auth,
          head: h("title", "t: " + data.metadata.title),
        },
        [
          h("h2", data.metadata.title),
          auth
            ? isOwner
              ? OwnerPanel({
                  threadID: routeParams.thread,
                  threadName: data.metadata.title,
                })
              : h(
                  "form",
                  {
                    style: "margin: 16px 0;",
                    action: `/t/${routeParams.thread}/${action}`,
                    method: "POST",
                  },
                  h(
                    "button",

                    data.subscribed ? "unsubscribe" : "subscribe"
                  )
                )
            : null,
          isOwner ? h("hr") : null,
          ThreadEntries({ entries: data.entries }),
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
};

const OwnerPanel = (props: { threadName: string; threadID: string }) => {
  return h(
    "div",
    { class: "p-4 bg-grey rounded", style: "padding-bottom: 8px;" },
    [
      h(
        "form",
        {
          class: "invalid",
          action: `/t/${props.threadID}/delete`,
          method: "POST",
        },
        [
          h("input", {
            style: "min-width: 160px;",
            required: true,
            pattern: props.threadName,
            placeholder: "type thread name to delete",
          }),
          h("button", { class: "destructive disabled" }, "delete thread"),
        ]
      ),
    ]
  );
};

const ThreadEntries = (props: { entries: ThreadEntry[] }) => {
  return h(
    "ul",
    {
      style: "line-height: 2em; list-style: none; padding: 0 0 28px 0;",
    },
    props.entries
      .filter((f) => f.approved === true)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((e, index) => {
        return h("li", [
          h(
            "div",
            {
              style: `display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; background: #fcf3a9; padding: 16px; border-radius: 16px; margin-right: ${Math.floor(
                Math.random() * (32 - -16) + -16
              )}px; margin-left: ${Math.floor(
                Math.random() * (32 - -16) + -16
              )}px;`,
            },
            [
              h("a", { href: e.url, style: "margin-right: 16px;" }, e.title),
              h("div", [
                h(
                  "p",
                  {
                    style: "margin: 0; line-height: 2em; font-size: 0.84em;",
                  },
                  [
                    h(
                      "span",
                      { style: "font-style: italic;" },
                      !e.submitter.display_name
                        ? "anonymous"
                        : !e.submitter.homepage
                        ? e.submitter.display_name
                        : h(
                            "a",
                            { href: e.submitter.homepage },
                            e.submitter.display_name
                          )
                    ),
                    h("span", " 〰 "),
                    h(
                      "span",
                      {
                        style: "font-style: italic; color: #867012;",
                      },
                      new Date(e.date).toLocaleString(undefined, {
                        dateStyle: "short",
                        // timeStyle: "short",
                        // dayPeriod: "short",
                      })
                    ),
                  ]
                ),
              ]),
            ]
          ),
          h("div", {
            style: `padding: 16px 0; ${
              index % 2 == 0
                ? `margin-left: 50%; border-left: 2px dashed darkgreen; border-radius: ${Math.floor(
                    Math.random() * (16 - 4) + 4
                  )}px 0 0 ${Math.floor(Math.random() * (16 - 4) + 4)}px;`
                : `margin-right: 50%; border-right: 2px dashed darkgreen; border-radius: 0 ${Math.floor(
                    Math.random() * (16 - 4) + 4
                  )}px ${Math.floor(Math.random() * (16 - 4) + 4)}px 0;`
            }`,
          }),
        ]);
      })
  );
};

const SubmitLinkForm = (props: {
  action: string;
  buttonText: string;
  threadcount: number;
}) =>
  h(
    "form",
    {
      style: `background: #d3ea94; padding: 16px; border-radius: 16px; margin-top: -48px;`,
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
        placeholder: "title",
        required: true,
        id: "title",
        name: "title",
        type: "text",
        maxlength: "140",
      }),
      h("label", { for: "url" }),
      h("input", {
        placeholder: "url",
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
      style: `background: #d3ea94; padding: 16px; border-radius: 16px; margin-top: -48px;`,
    },
    [
      h(
        "p",
        { style: "margin: 4px 0 8px 0; font-style: italic;" },
        "please log in to reply to this thread!"
      ),
    ]
  );
