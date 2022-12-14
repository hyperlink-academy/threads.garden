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
          head: h("title", "thread: " + data.metadata.title),
        },
        [
          h("div", { class: "flex flex-row gap-2" }, [
            h("h2", data.metadata.title),
            h(
              "p",
              {
                class: "align-self-center",
                style: "font-style: italic; color: #867012;",
              },
              new Date(data.metadata.dateCreated).toLocaleString(undefined, {
                dateStyle: "short",
                // timeStyle: "short",
                // dayPeriod: "short",
              })
            ),
          ]),
          over
            ? h(
                "p",
                {
                  style:
                    "font-style: italic; color: #933939; margin-top: 0; margin-bottom: 32px;",
                },
                "thread closed"
              )
            : h(
                "p",
                {
                  style:
                    "font-style: italic; color: #933939; margin-top: 0; margin-bottom: 32px;",
                },
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
              h(ThreadEntries, {
                entries: data.entries,
                auth: auth,
                over: over,
              }),
              over
                ? null
                : h(SubmitReply, {
                    authorized: !!auth,
                    buttonText: "reply",
                    threadcount: data.entries.length,
                    displayName: auth?.display_name,
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
  return h("details", [
    h(
      "summary",
      {
        style: "font-size: 1.2em; line-height: 2em; font-weight: bold;",
      },
      "settings"
    ),
    h(
      "form",
      {
        class: "invalid p-4 bg-grey rounded",
        style: "padding-bottom: 8px; margin-top: 0.8em;",
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
  ]);
};

const ThreadEntries = (props: {
  entries: ThreadEntry[];
  auth: Token | null;
  over: boolean;
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
          h(
            "div",
            {
              style: `background: #fcf3a9; padding: 16px; padding-bottom:0px; border-radius: 16px; margin-right: ${Math.floor(
                Math.random() * (32 - -16) + -16
              )}px; margin-left: ${Math.floor(
                Math.random() * (32 - -16) + -16
              )}px;`,
            },
            [
              !e.replies || e.replies?.length === 0
                ? null
                : h(
                    "div",
                    {
                      style:
                        "background: #e6f6e7; padding: 8px 16px; border-radius: 16px 16px 0 0; margin: -16px -16px 16px -16px;",
                    },
                    e.replies.map((replyID) => {
                      let reply = props.entries.find(
                        (entry) => entry.id === replyID
                      );
                      if (!reply) return null;
                      return h("span", [
                        h("span", "??? "),
                        h(
                          "a",
                          { href: reply.url, style: "margin-right: 8px;" },
                          reply.title
                        ),
                      ]);
                    })
                  ),
              h("div", { class: "flex flex-col" }, [
                h(
                  "div",
                  {
                    style:
                      "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding-bottom: 16px;",
                  },
                  [
                    h(
                      "a",
                      { href: e.url, style: "margin-right: 16px;" },
                      e.title
                    ),
                    h("div", [
                      h(
                        "p",
                        {
                          style:
                            "margin: 0; line-height: 2em; font-size: 0.84em;",
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
                          h("span", " ??? "),
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
                h(ReplyButton, { auth: !!props.auth, id: e.id, index }),
              ]),
            ]
          ),
          props.over && index == props.entries.length - 1
            ? null
            : h("div", {
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

const ReplyButton = (props: { auth: boolean; id: string; index: number }) => {
  if (!props.auth) return null;
  let id = `thread-entry-${props.index}`;
  return h(
    "div",
    {
      class: "w-full",
      style: "justify-content:flex-end;display:flex;",
    },
    h(
      "div",
      {
        class: "reply-wrapper",
        style:
          "width: max-content; background: #e1ecca; font-size: 0.84em; text-align: right; padding: 0px 16px; margin-right: -16px; border-radius: 16px 0 0 0;",
      },
      [
        h("input", {
          type: "checkbox",
          name: "reply",
          value: props.id,
          id,
          style: "accent-color: green; transform: scale(1.5);",
        }),
        h("label", { for: id }, "reply"),
      ]
    )
  );
};

const SubmitReply = (props: {
  buttonText: string;
  threadcount: number;
  authorized: boolean;
  displayName?: string;
}) => {
  if (!props.authorized)
    return h(
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

  return h(
    "div",
    {
      style: `background: #d3ea94; padding: 16px; border-radius: 16px; margin-top: -48px;`,
    },
    [
      h(
        "p",
        { style: "margin: 0 0 12px 0; font-style: italic;" },
        props.threadcount == 0 ? "start this thread!" : "add a reply?"
      ),
      !props.displayName
        ? h(
            "p",
            {
              style:
                "color: #b53100; margin: 0 0 16px 0; font-size: 0.84em; font-style: italic;",
            },
            "posting anonymously???set a display name from your homepage"
          )
        : "",
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
};

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
