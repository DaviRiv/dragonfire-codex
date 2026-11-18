/**
 * Pages that own their own height: they scroll inside the layout instead of
 * scrolling the document, so nothing may float over their bottom edge.
 */
const WORKSPACE_ROUTES = ["/coach", "/team", "/counter"];

const WIDE_ROUTES = [...WORKSPACE_ROUTES, "/lineups"];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isWorkspaceRoute(pathname: string): boolean {
  return matches(pathname, WORKSPACE_ROUTES);
}

export function isWideRoute(pathname: string): boolean {
  return matches(pathname, WIDE_ROUTES);
}
