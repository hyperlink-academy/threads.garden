import { verifyRequest } from "../auth";
import { h, html } from "../html";
import { Route } from "../router";
import { userDOClient } from "../UserDO";

export const home_route: Route = {
  method: "GET",
  route: "/home",
  handler: async (req, { env }) => {
    let auth = await verifyRequest(req, env.TOKEN_SECRET);
    if (!auth)
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });

    let userDO = env.USER.get(env.USER.idFromName(auth.username));
    let data = await userDOClient(userDO, "get_data", {});
    return new Response(
      html(
        {
          token: auth,
          head: [h("title", "threads.garden")],
        },
        [
          h(Settings, { ...data.metadata, username: auth.username }),
          h(
            "p",
            { style: "font-size: 0.9em; padding: 16px 0;" },
            "🌱🍄🌿🌼🍃🌸🌱🍄🌿🌼🍃🌸🌱🍄🌿🌼🍃🌸🌱"
          ),
          h("h3", "Created"),
          h(CreateThreadForm, {
            action: "/create_thread",
            buttonText: "create",
          }),
          data.threads.length === 0
            ? h(
                "p",
                { style: "font-style: italic;" },
                `you haven't started any threads — enter a title and hit "create" to make one!`
              )
            : h(
                "ul",
                { style: "line-height: 2em;" },
                data.threads.map((t) =>
                  h("li", h("a", { href: `/t/${t.id}` }, t.title))
                )
              ),
          h(
            "p",
            { style: "font-size: 0.9em; padding: 16px 0;" },
            "🌳🍃🌿🌼🐝🌷🌳🍃🌿🌼🐝🌷🌳🍃🌿🌼🐝🌷🌳"
          ),
          h("h3", "Subscribed"),
          data.subscriptions.length === 0
            ? h(
                "p",
                { style: "font-style: italic;" },
                `you aren't subscribed to any threads`
              )
            : h(
                "ul",
                { style: "line-height: 2em;" },
                data.subscriptions.map((t) =>
                  h("li", h("a", { href: `/t/${t.threadID}` }, t.threadTitle))
                )
              ),
          h(
            "p",
            { style: "font-size: 0.9em; padding: 16px 0;" },
            "🌼🌱🐞🌱🌺🌱🪲🌱🌻🌱🐜🌱🍄🌱🐛🌱🌸🌱🦋"
          ),
        ]
      ),
      {
        headers: { "Content-type": "text/html" },
      }
    );
  },
};

const Settings = (props: {
  display_name?: string;
  homepage?: string;
  username: string;
}) => {
  return h("details", [
    h(
      "summary",
      {
        style: "font-size: 1.2em; line-height: 2em; font-weight: bold;",
      },
      [
        "Welcome, ",
        props.display_name
          ? props.homepage
            ? h("a", { href: props.homepage }, props.display_name)
            : props.display_name
          : props.username,
        " 🌱",
      ]
    ),
    h("div", { style: "margin-top: 0.8em;", class: "p-4 bg-grey rounded" }, [
      h("div", { style: "margin-bottom: 8px;" }, [
        h("a", { href: "/logout" }, "logout"),
      ]),
      h(SetNameForm, {
        display_name: props.display_name || "",
        homepage: props.homepage || "",
      }),
    ]),
  ]);
};

const SetNameForm = (props: { display_name: string; homepage: string }) => {
  console.log(props);
  return h("form", { method: "POST", action: "/update_user" }, [
    h("input", {
      placeholder: "display name",
      id: "display_name",
      name: "display_name",
      value: props.display_name,
      type: "text",
      maxlength: "32",
    }),
    h("input", {
      placeholder: "homepage",
      value: props.homepage,
      id: "homepage",
      name: "homepage",
      type: "url",
    }),
    h("button", "Update display name"),
  ]);
};

export const CreateThreadForm = (props: {
  action: string;
  buttonText: string;
}) =>
  h(
    "form",
    {
      method: "POST",
      action: props.action,
      class: "p-4 rounded",
      style: "background: #d3ea94; padding-bottom: 8px;",
    },
    [
      h("input", {
        placeholder: "thread title",
        required: true,
        id: "title",
        name: "title",
        type: "text",
        maxlength: "140",
      }),
      h("button", props.buttonText),
    ]
  );
