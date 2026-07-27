/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cultures from "../cultures.js";
import type * as gods from "../gods.js";
import type * as graph_neo4jClient from "../graph/neo4jClient.js";
import type * as graph_queries from "../graph/queries.js";
import type * as graph_sync from "../graph/sync.js";
import type * as mythVariants from "../mythVariants.js";
import type * as myths from "../myths.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cultures: typeof cultures;
  gods: typeof gods;
  "graph/neo4jClient": typeof graph_neo4jClient;
  "graph/queries": typeof graph_queries;
  "graph/sync": typeof graph_sync;
  mythVariants: typeof mythVariants;
  myths: typeof myths;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
