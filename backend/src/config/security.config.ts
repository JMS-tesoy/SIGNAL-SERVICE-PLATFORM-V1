import { HelmetOptions } from "helmet";

export const securityConfig: HelmetOptions = {
  crossOriginResourcePolicy: { policy: "cross-origin" },
};

export const trustProxy = 1;
