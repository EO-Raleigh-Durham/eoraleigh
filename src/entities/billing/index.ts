// The chapter app's stand-in for edge8-web's billing entity (EO-owned): only the
// Svix signature check the Resend webhook uses (svix.ts is edge8's file).
export { readSvixHeaders, verifySvixSignature } from "./svix";
