import { verifyRequest } from "../auth";
import { h, html } from "../html";
import { Route } from "../router";
import { userDOClient } from "../UserDO";
import { redirect } from "../utils";
export const create_thread_route: Route = {
  method: "POST",
  route: "/create_thread",
  handler: async (request, { env }) => {
    let auth = await verifyRequest(request, env.TOKEN_SECRET);
    if (!auth) return redirect("/login");

    let formData = await request.formData();
    let title = formData.get("title");
    if (!title) return new Response("error, no url");

    let userDO = env.USER.get(env.USER.idFromName(auth.username));
    let thread = await userDOClient(userDO, "create_thread", {
      title: title.toString(),
    });
    if (thread.error)
      return new Response(
        html(
          {
            head: h("title", "An error occured"),
            token: auth,
          },
          [h("p", "Sorry! Something went wrong creating your thread.")]
        ),
        { headers: { "Content-type": "text/html" } }
      );
    return redirect("/t/" + thread.threadID);
  },
};
