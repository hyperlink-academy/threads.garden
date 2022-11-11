import { Env } from ".";
type Route<R extends string, Input extends object, Output extends object> = {
  route: R;
  handler: (
    msg: Input,
    ctx: { env: Env; state: DurableObjectState }
  ) => Promise<Output>;
};

export const makeRoute = <
  R extends string,
  Input extends object,
  Output extends object
>(
  route: Route<R, Input, Output>
) => route;
export const apiRouter =
  (Routes: readonly Route<string, any, any>[]) =>
  async (
    request: Request,
    path: string,
    ctx: {
      env: Env;
      state: DurableObjectState;
    }
  ) => {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.log("invalid body");
      return new Response("Error: body must be valid JSON", { status: 400 });
    }
    let route = Routes.find((f) => f.route === path);
    if (!route) return new Response("route not found", { status: 404 });
    let data = await route.handler(body as any, ctx);
    return new Response(JSON.stringify(data), {
      headers: { "Content-type": "application/json" },
    });
  };

export const makeAPIClient =
  <R extends readonly Route<string, any, any>[]>() =>
  async <T extends R[number]["route"]>(
    stub: DurableObjectStub,
    route: T,
    input: Parameters<Extract<R[number], { route: T }>["handler"]>[0]
  ) => {
    let response = await stub.fetch("http://internal/api/" + route, {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-type": "application/json" },
    });
    let data = await response.json();
    return data as ReturnType<Extract<R[number], { route: T }>["handler"]>;
  };
