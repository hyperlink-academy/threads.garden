import { Token, verifyRequest } from "auth";
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

    let timePassed = Date.now() - new Date(data.metadata.dateCreated).getTime();
    let over = timePassed > 7 * 24 * 60 * 60 * 1000;
    return new Response(
      html(
        {
          token: auth,
          head: h("title", "t: " + data.metadata.title),
        },
        [
          h("div", { class: "flex flex-row gap-2" }, [
            h("h2", data.metadata.title),
            h(
              "p",
              { class: "align-self-center" },
              new Date(data.metadata.dateCreated).toLocaleString(undefined, {
                dateStyle: "short",
                // timeStyle: "short",
                // dayPeriod: "short",
              })
            ),
          ]),
          over
            ? h("p", "thread closed")
            : h(
                "p",
                `thread closes in ${timeUntil(
                  7 * 24 * 60 * 60 * 1000 - timePassed
                )}`
              ),
          auth
            ? isOwner
              ? h(OwnerPanel, {
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
          h(
            "form",
            { action: `/t/${routeParams.thread}/reply`, method: "POST" },
            [
              h(ThreadEntries, { entries: data.entries, auth: auth }),
              over
                ? null
                : !auth
                ? h(SubmitNonAuth, { threadcount: data.entries.length })
                : h(SubmitLinkForm, {
                    buttonText: "reply",
                    threadcount: data.entries.length,
                  }),
            ]
          ),
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

const ThreadEntries = (props: {
  entries: ThreadEntry[];
  auth: Token | null;
}) => {
  return h(
    "ul",
    {
      style: "line-height: 2em; list-style: none; padding: 0 0 28px 0;",
    },
    props.entries
      .filter((f) => f.approved === true)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((e, index) => {
        let id = `thread-entry-${index}`;
        return h("li", [
          !e.replies || e.replies?.length === 0
            ? null
            : h(
                "div",
                e.replies.map((replyID) => {
                  let reply = props.entries.find(
                    (entry) => entry.id === replyID
                  );
                  if (!reply) return null;
                  return h("a", { href: reply.url }, reply.title);
                })
              ),
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
                !props.auth
                  ? ""
                  : h("form", [
                      h("input", {
                        type: "checkbox",
                        name: "reply",
                        value: e.id,
                        id,
                      }),
                      h("label", { for: id }, "reply"),
                    ]),
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

const SubmitLinkForm = (props: { buttonText: string; threadcount: number }) =>
  h(
    "div",
    {
      style: `background: #d3ea94; padding: 16px; border-radius: 16px; margin-top: -48px;`,
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

function timeUntil(ms: number) {
  let minutes = Math.floor(ms / 1000 / 60);
  if (minutes === 0) return "Now";
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  let hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours`;
  let days = Math.floor(hours / 24);
  return `${days} days`;
}
