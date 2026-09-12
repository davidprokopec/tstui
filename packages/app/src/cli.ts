export interface CliOptions {
  readonly demo: boolean;
  readonly smoke: boolean;
  readonly server: string;
  readonly nickname: string;
}

const valueAfter = (
  args: ReadonlyArray<string>,
  flag: string,
): string | undefined => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};

export const parseCli = (args: ReadonlyArray<string>): CliOptions => ({
  demo: args.includes("--demo"),
  smoke: args.includes("--smoke"),
  server: valueAfter(args, "--server") ?? "localhost",
  nickname: valueAfter(args, "--nickname") ?? "tstui-user",
});
