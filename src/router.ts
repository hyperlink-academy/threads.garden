import { Env } from ".";

export type Route = {
  method: "GET" | "POST";
  route: string;
  handler: (
    request: Request,
    ctx: {
      queryParams: { [k: string]: string };
      searchParams: { [k: string]: string };
      env: Env;
    }
  ) => Promise<Response>;
};

export function Router({ base, routes }: { base: string; routes: Route[] }) {
  let routeMatchers = routes.map((r) => ({
    ...r,
    matcher: RegExp(
      `^${
        (base + r.route)
          .replace(/(\/?)\*/g, "($1.*)?") // trailing wildcard
          .replace(/(\/$)|((?<=\/)\/)/, "") // remove trailing slash or double slash from joins
          .replace(/:(\w+)(\?)?(\.)?/g, "$2(?<$1>[^/]+)$2$3") // named params
          .replace(/\.(?=[\w(])/, "\\.") // dot in path
          .replace(/\)\.\?\(([^\[]+)\[\^/g, "?)\\.?($1(?<=\\.)[^\\.") // optional image format
      }/*$`
    ),
  }));
  return async (request: Request, env: Env) => {
    let match,
      url = new URL(request.url);
    for (let { method, matcher, handler } of routeMatchers) {
      if (method === request.method && (match = url.pathname.match(matcher))) {
        return await handler(request, {
          env,
          queryParams: match.groups || {},
          searchParams: Object.fromEntries(url.searchParams),
        }).catch(() => {
          return new Response("An unexpected Error occured", { status: 500 });
        });
      }
    }
    return new Response("404: Not Found", { status: 404 });
  };
}
