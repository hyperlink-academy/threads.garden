import { addTokenHeaders, verifyRequest } from "../auth";
import { Route } from "../router";
import { userDOClient } from "../UserDO";
import { redirect } from "../utils";
export const update_user_route: Route = {
  method: "POST",
  route: "/update_user",
  handler: async (request, { env }) => {
    let auth = await verifyRequest(request, env.TOKEN_SECRET);
    if (!auth) return redirect("/login");

    let formData = await request.formData();
    let display_name = formData.get("display_name")?.toString();
    let homepage = formData.get("homepage")?.toString();

    let userDO = env.USER.get(env.USER.idFromName(auth.username));
    await userDOClient(userDO, "update_user_data", {
      username: auth.username,
      display_name: display_name,
      homepage: homepage,
    });
    let headers = new Headers();
    await addTokenHeaders(
      { username: auth.username, display_name, homepage },
      headers,
      env.TOKEN_SECRET
    );
    return redirect("/home", headers);
  },
};
