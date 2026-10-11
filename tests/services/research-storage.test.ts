import { expect, test } from "bun:test";
import { parseCsv, groupRowsByMarket } from "../../scripts/nothing-ever-happens/storage";

test("CSV reader retains multiline titles and escaped quotes", () => {
  const rows = parseCsv('id,title,slug,category,timestamp,scan_id\r\nm,"A, \"\"quote\"\"\nsecond line",s,c,2026-10-11T12:00:00Z,1\r\n');
  expect(rows).toHaveLength(1);
  expect(rows[0].title).toBe('A, "quote"\nsecond line');
  expect(() => parseCsv('id,title\na,"broken')).toThrow();
});

test("entry chronology survives restarted scan IDs", () => {
  const rows = parseCsv('id,title,slug,category,timestamp,scan_id\nm,later,s,c,2026-10-11T13:00:00Z,1\nm,earlier,s,c,2026-10-11T12:00:00Z,99\n');
  expect(groupRowsByMarket(rows).get("m")?.[0].title).toBe("earlier");
  expect(() => groupRowsByMarket([{ ...rows[0], timestamp: "invalid" }])).toThrow();
});
