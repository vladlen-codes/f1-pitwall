/** Returns the last item whose `date` is at or before `ms`, or null if none yet. Assumes `arr` is sorted ascending by date. */
export function latestAtOrBefore<T extends { date: string }>(arr: T[], ms: number): T | null {
  let lo = 0;
  let hi = arr.length - 1;
  let result: T | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(arr[mid].date).getTime() <= ms) {
      result = arr[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
