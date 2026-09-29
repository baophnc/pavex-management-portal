/**
 * Code 128 encoder for parcel and tracking codes. Text uses code set B; runs of digits long enough
 * to pay for the switch use code set C (two digits per symbol), which keeps the barcode short.
 */

// Bar/space widths of each symbol value, starting with a bar. 103–105 are the start codes, 106 is stop.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const CODE_C = 99;
const CODE_B = 100;
const START_B = 104;
const START_C = 105;
const STOP = 106;

function isDigit(text: string, index: number) {
  const code = text.charCodeAt(index);
  return code >= 48 && code <= 57;
}

function digitRun(text: string, from: number) {
  let end = from;
  while (end < text.length && isDigit(text, end)) end += 1;
  return end - from;
}

/** Symbol values from the start code through the checksum. Throws for characters outside ASCII 32–126. */
export function code128Values(text: string): number[] {
  if (text.length === 0) throw new Error("Code 128 needs at least one character.");
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 || code > 126) throw new Error(`Code 128 cannot encode "${text[index]}".`);
  }

  const values: number[] = [];
  let set: "B" | "C" | null = null;
  let index = 0;

  const switchToB = () => {
    if (set === "B") return;
    values.push(set === null ? START_B : CODE_B);
    set = "B";
  };

  while (index < text.length) {
    const run = digitRun(text, index);
    const atEdge = set === null || index + run === text.length;
    // Switching to C and back costs two symbols, so a run inside the text must save at least three.
    if (run >= (atEdge ? 4 : 6)) {
      if (run % 2 === 1) {
        switchToB();
        values.push(text.charCodeAt(index) - 32);
        index += 1;
      }
      values.push(set === null ? START_C : CODE_C);
      set = "C";
      const end = index + run - (run % 2);
      for (; index < end; index += 2) values.push(Number(text.slice(index, index + 2)));
    } else {
      switchToB();
      values.push(text.charCodeAt(index) - 32);
      index += 1;
    }
  }

  const checksum = values.reduce((sum, value, position) => sum + value * Math.max(position, 1), 0) % 103;
  return [...values, checksum];
}

/** Module widths of the whole symbol (bar, space, bar, …), stop code included, without quiet zones. */
export function code128Widths(text: string): number[] {
  return [...code128Values(text), STOP].flatMap((value) => [...PATTERNS[value]].map(Number));
}
