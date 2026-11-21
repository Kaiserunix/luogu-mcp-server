export interface LuoguRouteCapability {
  name: string;
  status: "available" | "auth_required" | "planned";
  note: string;
}

export interface LuoguRouteCapabilities {
  route: "luogu";
  tools: LuoguRouteCapability[];
}

/** Return the capability matrix for public, auth-gated, and planned Luogu MCP routes. */
export function getLuoguRouteCapabilities(): LuoguRouteCapabilities {
  return {
    route: "luogu",
    tools: [
      {
        name: "luogu_search_problems",
        status: "available",
        note: "Public content-only problem list endpoint.",
      },
      {
        name: "luogu_fetch_problem",
        status: "available",
        note: "Public content-only problem page endpoint.",
      },
      {
        name: "luogu_resolve_problem",
        status: "available",
        note: "Resolves Luogu URLs, problem ids, or title fragments to full problem details.",
      },
      {
        name: "luogu_find_related_problems",
        status: "available",
        note: "Combines seed topic/pain-point recommendations with live Luogu search.",
      },
      {
        name: "luogu_list_algorithm_topics",
        status: "available",
        note: "Static canonical topic catalog with aliases and known Luogu tag ids.",
      },
      {
        name: "luogu_find_topic_problems",
        status: "available",
        note: "Multi-query topic discovery with alias fallback, deduplication, and ranking.",
      },
      {
        name: "luogu_search_problem_sets",
        status: "available",
        note: "Public training list endpoint.",
      },
      {
        name: "luogu_fetch_problem_set",
        status: "available",
        note: "Public training page endpoint.",
      },
      {
        name: "luogu_recommend_problems",
        status: "available",
        note: "Offline seed problem recommendations by topic or pain point.",
      },
      {
        name: "luogu_get_user_profile",
        status: "available",
        note: "Public user profile page endpoint; some practice counters can be null.",
      },
      {
        name: "luogu_get_capabilities",
        status: "available",
        note: "Reports route capability statuses.",
      },
      {
        name: "luogu_get_recent_submissions",
        status: "auth_required",
        note: "Record list currently redirects to login without Luogu session cookies.",
      },
      {
        name: "luogu_search_solutions",
        status: "auth_required",
        note: "Problem solution pages currently require login in live probes.",
      },
      {
        name: "luogu_search_discussions",
        status: "auth_required",
        note: "Discussion pages currently require login in live probes.",
      },
      {
        name: "luogu_submit_solution",
        status: "planned",
        note: "Not implemented; would require authenticated session handling and explicit write-tool safety gates.",
      },
    ],
  };
}
