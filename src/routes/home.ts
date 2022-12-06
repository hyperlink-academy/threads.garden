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
          h("h3", [
            "Welcome, ",
            data.metadata?.display_name
              ? data.metadata?.homepage
                ? h(
                    "a",
                    { href: data.metadata.homepage },
                    data.metadata.display_name
                  )
                : data.metadata?.display_name
              : auth.username,
          ]),
          h("a", { href: "/logout" }, "logout"),
          SetNameForm({
            display_name: data.metadata?.display_name || "",
            homepage: data.metadata?.homepage || "",
          }),
          h(
            "p",
            "this is your homepage, it should have a list of stuff. If you aren't logged in, redirect"
          ),
          data.threads.length === 0
            ? null
            : h(
                "ul",
                data.threads.map((t) =>
                  h("li", h("a", { href: `/t/${t.id}` }, t.title))
                )
              ),
          SubmitLinkForm({
            action: "/create_thread",
            buttonText: "create",
          }),
        ]
      ),
      {
        headers: { "Content-type": "text/html" },
      }
    );
  },
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

export const SubmitLinkForm = (props: { action: string; buttonText: string }) =>
  h(
    "form",
    {
      method: "POST",
      action: props.action,
    },
    [
      h("input", {
        placeholder: "Thread Title",
        required: true,
        id: "title",
        name: "title",
        type: "text",
        maxlength: "140",
      }),
      h("button", props.buttonText),
    ]
  );
