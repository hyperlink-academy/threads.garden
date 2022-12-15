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
            "div",
            {
              style:
                "width: 100%; text-align: center; display: flex; flex-flow: row nowrap; justify-content: space-between; padding: 16px 0; font-size: 0.8em;",
            },
            [
              h("span", "🌱"),
              h("span", "🍄"),
              h("span", "🌿"),
              h("span", "🌼"),
              h("span", "🍃"),
              h("span", "🌸"),
              h("span", "🌱"),
              h("span", "🍄"),
              h("span", "🌿"),
              h("span", "🌼"),
              h("span", "🍃"),
              h("span", "🌸"),
              h("span", "🌱"),
            ]
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
                {
                  style:
                    "line-height: 2em; list-style: none; padding: 0; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px;",
                },
                data.threads.map((t) =>
                  h(
                    "li",
                    {
                      style: "display: flex; flex: auto;",
                    },
                    h(
                      "a",
                      {
                        href: `/t/${t.id}`,
                        onMouseOver: `this.style.backgroundColor='hsl(${Math.floor(
                          Math.random() * (150 - 60) + 60
                        )}deg, 60%, 30%)'; this.style.transform='scale(1.02)'`,
                        onMouseOut: `this.style.backgroundColor='hsl(${Math.floor(
                          Math.random() * (150 - 60) + 60
                        )}deg, 60%, 30%)'; this.style.transform='scale(1)'`,
                        style: `color: white; background-color: hsl(${Math.floor(
                          Math.random() * (150 - 60) + 60
                        )}deg, 60%, 30%); transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out; padding: 32px 16px; border-radius: 16px; flex: auto; text-decoration: none;`,
                      },
                      t.title
                    )
                  )
                )
              ),
          h(
            "div",
            {
              style:
                "width: 100%; text-align: center; display: flex; flex-flow: row nowrap; justify-content: space-between; padding: 16px 0; font-size: 0.8em;",
            },
            [
              h("span", "🌳"),
              h("span", "🍃"),
              h("span", "🌿"),
              h("span", "🌼"),
              h("span", "🐝"),
              h("span", "🌷"),
              h("span", "🌳"),
              h("span", "🍃"),
              h("span", "🌿"),
              h("span", "🌼"),
              h("span", "🐝"),
              h("span", "🌷"),
              h("span", "🌳"),
            ]
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
            "div",
            {
              style:
                "width: 100%; text-align: center; display: flex; flex-flow: row nowrap; justify-content: space-between; padding: 16px 0; font-size: 0.8em;",
            },
            [
              h("span", "🌼"),
              h("span", "🌱"),
              h("span", "🐞"),
              h("span", "🌱"),
              h("span", "🌺"),
              h("span", "🌱"),
              h("span", "🪲"),
              h("span", "🌱"),
              h("span", "🌻"),
              h("span", "🌱"),
              h("span", "🐛"),
              h("span", "🌱"),
              h("span", "🌼"),
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
