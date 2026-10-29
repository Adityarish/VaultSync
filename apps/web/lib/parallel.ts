export async function runInParallel<T>(
  items: readonly T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<void>,
  shouldStart: () => boolean = () => true,
): Promise<void> {
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (shouldStart()) {
      const index = nextIndex;
      if (index >= items.length) return;
      nextIndex += 1;
      await handler(items[index]!, index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
