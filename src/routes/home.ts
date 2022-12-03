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
    let hours = 0;
    if (data.nextEmail) {
      hours = Math.floor(
        (new Date(data.nextEmail).getTime() - Date.now()) / (1000 * 60 * 60)
      );
    }
    return new Response(
      html(
        {
          token: auth,
          head: [h("title", "threads.garden")],
        },
        [
          h("h3", "Welcome, " + auth.username),
          h("a", { href: "/logout" }, "logout"),
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
          data.nextEmail ? h("span", `${hours} hours from now`) : null,
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
