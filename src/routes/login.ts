import { Route } from "../router";
import { h, html } from "../html";
import { addTokenHeaders, removeTokenHeaders, verifyRequest } from "../auth";
import { userDOClient } from "../UserDO";
import { sendEmail } from "../email";
import { redirect } from "../utils";

export const LoginRoutes: Route[] = [
  {
    method: "POST",
    route: "/login",
    handler: async (request, { env }) => {
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      let formData = await request.formData();
      let email = formData.get("email");
      if (auth || !email)
        return new Response("", { status: 302, headers: { Location: "/" } });
      // If it matches add a login header cookie to the request and then redirect to the homepage
      let emailNormalized = email.toString().toLocaleLowerCase();
      let userDO = env.USER.get(env.USER.idFromName(emailNormalized));
      let loginToken = await userDOClient(userDO, "generateLoginToken", {});

      let url = new URL(request.url);
      let link = new URL(`${url.origin}/magic_link`);

      link.searchParams.set("email", emailNormalized);
      link.searchParams.set("token", loginToken.token);

      await sendEmail(
        emailNormalized,
        `Sign In (${new Date().toLocaleDateString(undefined, {
          day: "2-digit",
          year: "numeric",
          month: "short",
          hour: "numeric",
          minute: "numeric",
        })})`,
        h("div", [
          (h("h1", "Hi! Welcome to threads.garden"),
          h("span", [
            `Click `,
            h("a", { href: link.toString() }, "here"),
            ` to sign in.`,
          ])),
        ])(),
        env.POSTMARK_API_TOKEN
      );

      return new Response(
        html(
          [],
          h("p", [
            "We sent an an email to ",
            h("code", emailNormalized),
            ". Click the link there to login.",
          ])
        ),
        {
          headers: { "Content-type": "text/html" },
        }
      );
    },
  },
  {
    method: "GET",
    route: "/magic_link",
    handler: async (_req, { env, searchParams }) => {
      let { email, token } = searchParams;
      if (!email || !token) return redirect("/");

      let emailNormalized = email.toString().toLocaleLowerCase();
      let userDO = env.USER.get(env.USER.idFromName(emailNormalized));
      let loginToken = await userDOClient(userDO, "verify_login_token", {
        token,
      });

      if (loginToken.valid) {
        let headers = new Headers();
        await addTokenHeaders({ username: email }, headers, env.TOKEN_SECRET);
        return redirect("/home", headers);
      } else
        return new Response(
          html(
            [],
            h("p", [
              "Your link is expired or invalid please ",
              h("a", { href: "/login" }, "login again"),
            ])
          ),
          { headers: { "Content-type": "text/html" } }
        );
      return new Response("");
    },
  },
  {
    method: "GET",
    route: "/logout",
    handler: async (_req, _urlParams) => {
      let headers = new Headers({ Location: "/" });
      removeTokenHeaders(headers);
      return new Response("", {
        status: 302,
        headers,
      });
    },
  },
  {
    method: "GET",
    route: "/login",
    handler: async (req, { env }) => {
      // Check to see if they are logged in and if so redirect to a homepage
      let auth = await verifyRequest(req, env.TOKEN_SECRET);
      if (auth)
        return new Response("", {
          status: 302,
          headers: { Location: "/home" },
        });
      return new Response(LoginPage({ incorrect: false }), {
        headers: { "Content-type": "text/html" },
      });
    },
  },
];

const LoginPage = (props: { incorrect: boolean }) =>
  html(
    [h("title", "threads.garden: login")],
    [
      h("form", { method: "POST" }, [
        h("div", [
          h("label", { for: "email" }, "email"),
          h("input", { id: "email", name: "email", type: "email" }),
        ]),
        h("button", { type: "submit" }, "login"),
      ]),
      props.incorrect
        ? h("span", { style: "color:red;" }, "incorrect username password")
        : null,
    ]
  );
