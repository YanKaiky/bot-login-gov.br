export const wait = async (ms: number): Promise<any> => {
  console.log(`Waiting for ${ms / 1000}s...`);
  return new Promise((res: any) => setTimeout(res, ms));
};
