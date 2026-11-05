/** Dev-only routes are opt-in: hosts like Render don't set NODE_ENV, so an opt-out guard would expose them. */
export const devRoutesEnabled = (env: Record<string, string | undefined>) => env.DEV_ROUTES === '1'
