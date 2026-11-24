/* Minimal .xlsx reader: returns the first sheet as an array of rows (arrays of cell text).
   An .xlsx file is a zip of XML files; the browser's DecompressionStream inflates them, so no library is needed. */
async function readXlsx(file){
  const buf = new Uint8Array(await file.arrayBuffer()), view = new DataView(buf.buffer);
  const bad = () => new Error("That file is not an Excel .xlsx workbook.");

  /* zip: find the end-of-central-directory record, then list every entry */
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  if (eocd < 0) throw bad();
  const entries = {}, utf8 = new TextDecoder();
  for (let p = view.getUint32(eocd + 16, true), n = view.getUint16(eocd + 10, true); n-- > 0;){
    if (view.getUint32(p, true) !== 0x02014b50) throw bad();
    const nameLen = view.getUint16(p + 28, true);
    entries[utf8.decode(buf.subarray(p + 46, p + 46 + nameLen))] = {
      method: view.getUint16(p + 10, true), size: view.getUint32(p + 20, true), at: view.getUint32(p + 42, true) };
    p += 46 + nameLen + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
  }
  async function xml(name){
    const e = entries[name]; if (!e) return null;
    const start = e.at + 30 + view.getUint16(e.at + 26, true) + view.getUint16(e.at + 28, true);
    let data = buf.subarray(start, start + e.size);
    if (e.method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    else if (e.method !== 0) throw bad();
    return new DOMParser().parseFromString(utf8.decode(data), "application/xml");
  }
  const tags = (node, tag) => [...node.getElementsByTagNameNS("*", tag)];

  /* the first sheet listed in the workbook, wherever its file lives */
  const book = await xml("xl/workbook.xml"), rels = await xml("xl/_rels/workbook.xml.rels");
  if (!book || !rels) throw bad();
  const first = tags(book, "sheet")[0]; if (!first) throw bad();
  const rid = [...first.attributes].find(a => a.localName === "id" && a.prefix)?.value;
  const target = tags(rels, "Relationship").find(r => r.getAttribute("Id") === rid)?.getAttribute("Target") || "";
  const sheet = await xml(target.startsWith("/") ? target.slice(1) : "xl/" + target);
  if (!sheet) throw bad();

  const strings = await xml("xl/sharedStrings.xml");
  const shared = strings ? tags(strings, "si").map(si => tags(si, "t").map(t => t.textContent).join("")) : [];
  const colIndex = ref => [...ref.replace(/\d+$/, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return tags(sheet, "row").map(row => {
    const out = [];
    tags(row, "c").forEach((c, i) => {
      const type = c.getAttribute("t"), v = tags(c, "v")[0]?.textContent ?? "";
      const ref = c.getAttribute("r");
      out[ref ? colIndex(ref) : i] = type === "s" ? shared[+v] ?? "" : type === "inlineStr" ? tags(c, "t").map(t => t.textContent).join("") : v;
    });
    return Array.from(out, x => x ?? "");
  });
}
