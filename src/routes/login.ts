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
      let link = new URL(
        `${request.headers.get("origin")?.toString()}/magic_link`
      );

      link.searchParams.set("email", emailNormalized);
      link.searchParams.set("token", loginToken.token);

      await sendEmail({
        To: emailNormalized,
        Subject: `Sign In (${new Date().toLocaleDateString(undefined, {
          day: "2-digit",
          year: "numeric",
          month: "short",
          hour: "numeric",
          minute: "numeric",
        })})`,
        content: h("div", [
          h("h1", "Hi! Welcome to threads.garden"),
          h("p", [
            `Click `,
            h("a", { href: link.toString() }, "here"),
            ` to sign in.`,
          ]),
          h("p", [`Or, copy this code: `, h("code", {}, loginToken.token)]),
        ])(),
        POSTMARK_API_TOKEN: env.POSTMARK_API_TOKEN,
      });

      return new Response(
        html(
          { token: null, head: [] },
          h("p", [
            "We sent an an email to ",
            h("code", emailNormalized),
            ". Click the link there to login. Or copy and paste the code below",
            h("form", { action: "/magic_link" }, [
              h("input", {
                style: "display:none;",
                value: emailNormalized,
                name: "email",
              }),
              h("input", { name: "token", autocomplete: "off" }),
              h("button", "login"),
            ]),
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
        owner: emailNormalized,
        token,
      });

      if (loginToken.valid) {
        let headers = new Headers();
        await addTokenHeaders(
          {
            username: email,
            display_name: loginToken.metadata?.display_name,
            homepage: loginToken.metadata?.homepage,
          },
          headers,
          env.TOKEN_SECRET
        );
        return redirect("/", headers);
      } else
        return new Response(
          html(
            { head: [], token: null },
            h("p", [
              "Your link is expired or invalid please ",
              h("a", { href: "/login" }, "login again"),
            ])
          ),
          { headers: { "Content-type": "text/html" } }
        );
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
          headers: { Location: "/" },
        });
      return new Response(LoginPage({ incorrect: false }), {
        headers: { "Content-type": "text/html" },
      });
    },
  },
];

const LoginPage = (props: { incorrect: boolean }) =>
  html(
    {
      token: null,
      head: h("title", "threads.garden: login"),
    },
    [
      h("form", { method: "POST", class: "p-4 bg-grey rounded" }, [
        h(
          "p",
          { style: "margin: 0 0 16px 0;" },
          "enter your email; we'll send you a link to log in!"
        ),
        h("div", [
          // h("label", { for: "email" }, "email"),
          h("input", {
            id: "email",
            name: "email",
            type: "email",
            placeholder: "email",
          }),
        ]),
        h("button", { type: "submit" }, "login"),
      ]),
      props.incorrect
        ? h("span", { style: "color:red;" }, "incorrect username password")
        : null,
    ]
  );
