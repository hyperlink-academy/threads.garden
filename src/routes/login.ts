import { Route } from "../router";
import { h, html } from "../html";
import { addTokenHeaders, removeTokenHeaders, verifyRequest } from "../auth";

export const LoginRoutes: Route[] = [
  {
    method: "POST",
    route: "/login",
    handler: async (request) => {
      let formData = await request.formData();
      let username = formData.get("username");
      let password = formData.get("password");
      // If it matches add a login header cookie to the request and then redirect to the homepage

      let authorized = username === "jared" && password === "password";
      if (!authorized)
        return new Response(LoginPage({ incorrect: true }), {
          headers: { "Content-type": "text/html" },
        });

      let headers = new Headers({ Location: "/home" });
      await addTokenHeaders({ username: "jared" }, headers);
      return new Response("", {
        status: 302,
        headers,
      });
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
    handler: async (req, _urlParams) => {
      // Check to see if they are logged in and if so redirect to a homepage
      let auth = await verifyRequest(req);
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
          h("label", { for: "username" }, "username"),
          h("input", { id: "username", name: "username" }),
        ]),
        h("div", [
          h("label", { for: "password" }, "password"),
          h("input", {
            id: "password",
            name: "password",
            type: "password",
          }),
        ]),
        h("button", { type: "submit" }, "login"),
      ]),
      props.incorrect
        ? h("span", { style: "color:red;" }, "incorrect username password")
        : null,
    ]
  );
