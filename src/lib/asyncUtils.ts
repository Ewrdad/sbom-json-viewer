export const tick = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function batchProcess<T>(
  iterable: Iterable<T>,
  callback: (item: T, index: number) => void,
  chunkSize = 250,
) {
  let index = 0;
  for (const item of iterable) {
    callback(item, index);
    index += 1;
    if (index % chunkSize === 0) {
      await tick();
    }
  }
}
