declare module "ethereum-blockies-base64" {
  /** Returns a base64 PNG data-URI identicon deterministically derived from the seed string. */
  const makeBlockie: (seed: string) => string;
  export default makeBlockie;
}
