import { apiKeyClient } from "@better-auth/api-key/client";
import {
  anonymousClient,
  deviceAuthorizationClient,
  emailOTPClient,
  genericOAuthClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { resolveApiOrigin } from "@/lib/resolve-api-url";
import { ac, admin, member, owner } from "./permissions";

export const authClient = createAuthClient({
  baseURL: resolveApiOrigin(),
  basePath: "/api/auth",
  plugins: [
    anonymousClient(),
    lastLoginMethodClient(),
    magicLinkClient(),
    emailOTPClient(),
    organizationClient({
      ac,
      roles: {
        member,
        admin,
        owner,
      },
      teams: {
        enabled: true,
      },
    }),
    genericOAuthClient(),
    deviceAuthorizationClient(),
    apiKeyClient(),
    inferAdditionalFields({
      user: {
        locale: {
          type: "string",
          required: false,
          input: true,
        },
      },
    }),
  ],
});
