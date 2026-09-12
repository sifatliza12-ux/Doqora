// Pure amount-in-words generation — no server/client-only APIs, safe to
// import from both a 'use client' live preview and a 'use server' save
// action, matching invoice-calculations.ts and invoice-qr.ts.
//
// Uses n2words (github.com/forzagreen/n2words) for the hard combinatorial
// part — arbitrary-magnitude number grouping (hundreds/thousands/millions)
// — verified independently against this project's locked ground-truth
// reference case (283110.68 SAR). Its own Arabic *currency* wrapper
// (toCurrency) was NOT used: testing exposed two real bugs that fail the
// ground truth if used as-is —
//
//   1. Orthography: it spells "two hundred" as مئتان; the reference
//      material uses the traditional مائتان (extra alif) throughout, and
//      places the tanwin-fatha diacritic after the bearer alif (ألفاً)
//      where the reference places it on the preceding consonant, before
//      the alif (ألفًا) — corrected in fixArabicOrthography() below.
//
//   2. Grammar: its currency-noun pluralization picks a form based on the
//      TOTAL numeric value (e.g. "is 283110 >= 11?") rather than the
//      number's last spoken segment, which is what Arabic numeral-noun
//      agreement actually depends on for compound numbers. 283110 riyals
//      ends in "...and ten" (وعشرة), and "ten" governs a PLURAL noun
//      (ريالات) — but n2words's toCurrency, seeing a total >= 11, emits
//      the singular accusative form (ريالاً) instead. This is exactly the
//      class of bug the user warned to check for, and it's why this file
//      hand-writes the noun-form selection (a small, fully-enumerable
//      case table) instead of trusting the library's currency layer,
//      while still delegating the genuinely hard part — the cardinal
//      number-to-words conversion itself — to n2words's toCardinal.
//
//   3. Case marking on round hundreds/thousands (100, 5000, ...): the
//      noun there follows a scale word (مائة/آلاف/...) in an idafa
//      (construct) relationship, which takes a genitive — not accusative
//      — noun, so it gets the bare singular rather than the
//      accusative-tanwin form the 11-99 tamyiz case correctly uses. See
//      arabicUnitPhrase()'s "lastTwoDigits === 0" branch.
//
//   4. Construct-state duals (200, 2000, 1200, 2200, ...): n2words emits
//      the scale word مائة/ألف's dual as its independent form (مئتان/
//      ألفان). But per (3) above, that scale word is mudaf (construct) to
//      the following counted noun — and a dual noun in construct state
//      drops its ن regardless of case (مائتان -> مائتا, ألفان -> ألفا),
//      the same way a sound plural does. Only the scale word immediately
//      adjacent to the counted noun is mudaf to it (an earlier ...وألفان
//      segment in a compound like 2200 is merely coordinated, not itself
//      mudaf, and keeps its ن) — see toConstructStateDual() below.
import { Decimal } from "decimal.js";
import { toCardinal as arCardinal } from "n2words/ar-SA";
import { toCardinal as enCardinal } from "n2words/en";

export type DecimalInput = string | number | Decimal;

/**
 * [count=1, count=2, count 3-10, count 11-99] — the four forms Arabic
 * nouns take depending on what precedes them. Index 0 (the bare singular)
 * is also reused for a round multiple of 100/1000/etc — see
 * arabicUnitPhrase()'s "lastTwoDigits === 0" branch below.
 */
type ArabicNounForms = [string, string, string, string];

const AR_RIAL_FORMS: ArabicNounForms = ["ريال", "ريالان", "ريالات", "ريالاً"];
const AR_HALALA_FORMS: ArabicNounForms = ["هللة", "هللتان", "هللات", "هللة"];

const AR_ZERO = "صفر";
const AR_ONE_MASCULINE = "واحد";
const AR_ONE_FEMININE = "واحدة";

function fixArabicOrthography(words: string): string {
  return words
    .replaceAll("مئتان", "مائتان")
    .replaceAll("مئتا", "مائتا")
    .replace(/اً/g, "ًا"); // alif+fathatan -> fathatan+alif
}

/**
 * Drops the ن from a dual scale word (مائتان -> مائتا, ألفان -> ألفا) when
 * it directly precedes — and is therefore mudaf (construct) to — the
 * counted noun. Only matches at the END of the number-words string, since
 * that's the one word actually adjacent to the noun; an earlier
 * "...ألفان و..." segment in a compound number (e.g. 2200 -> "ألفان
 * ومائتان") is joined by wa- as a coordinated, independent number, not
 * mudaf, and correctly keeps its ن.
 */
function toConstructStateDual(numberWords: string): string {
  return numberWords.replace(/(مائتان|ألفان)$/, (match) => (match === "مائتان" ? "مائتا" : "ألفا"));
}

/**
 * Renders a single currency-unit count ("283110" riyals, or "68" halalas)
 * as an Arabic noun phrase with the grammatically correct noun form.
 *
 * `nounTrueGender` only affects the count===1 idiom (نريال واحد" vs
 * "هللة واحدة"), which follows normal — not polarity-inverted — gender
 * agreement, a well-established rule distinct from the 3-10 range.
 *
 * For every other count, the cardinal number words are always generated
 * with the masculine parameter, regardless of the noun's true gender: the
 * ground truth (68 halalas -> "ثمانية", the masculine/"citation" form of
 * eight, not the feminine-polarity "ثمان" a strict 3-10 gender-inversion
 * rule would predict) shows the reference material does not apply that
 * inversion to a compound number's ones-digit. The same simplification is
 * applied uniformly here (including to a bare 3-10 count, where no
 * ground-truth example exists either way) for one consistent, verifiable
 * rule rather than a second, unconfirmed special case.
 */
function arabicUnitPhrase(
  count: number,
  forms: ArabicNounForms,
  nounTrueGender: "masculine" | "feminine"
): string {
  // Zero uses the same bare/genitive noun (forms[0]) as the round-hundred/
  // thousand case above, not the 11-99 tamyiz accusative (forms[3]).
  // Reasoning (no locked reference example either way, unlike the
  // round-hundred/thousand fix — this is a judgment call, not a confirmed
  // fact): the accusative-tanwin tamyiz form exists specifically to
  // disambiguate the 11-99 compound cardinals, which is a classical-Arabic
  // rule for that specific numeral class. "صفر" was never part of that
  // classical numeral system (zero as a counting number is a modern
  // addition) — structurally it's an invariant singular quantity-noun with
  // no compound ones/tens morphology, the same shape as مائة/ألف, not the
  // shape of an 11-99 number. By that structural analogy it takes the same
  // idafa (construct) treatment as those: "صفر ريال", not "صفر ريالاً".
  // This also matches the far more common real-world register (financial/
  // legal Arabic reads "الرصيد صفر ريال", not "...صفر ريالاً").
  if (count === 0) return `${AR_ZERO} ${forms[0]}`;
  if (count === 1) {
    return `${forms[0]} ${nounTrueGender === "feminine" ? AR_ONE_FEMININE : AR_ONE_MASCULINE}`;
  }
  if (count === 2) return forms[1];

  const lastTwoDigits = count % 100;
  const numberWords = fixArabicOrthography(arCardinal(count, { gender: "masculine" }));

  if (lastTwoDigits >= 3 && lastTwoDigits <= 10) {
    return `${numberWords} ${forms[2]}`; // plural
  }
  if (lastTwoDigits === 0) {
    // Round hundred/thousand/etc (100, 500, 5000, ...): the noun directly
    // follows a scale word (مائة/ألف/آلاف/...) in an idafa (construct)
    // relationship — "thousands OF riyal" — not a tamyiz relationship like
    // the 11-99 case below. The second noun in an idafa is genitive, and
    // genitive indefinite nouns don't take the accusative-marking
    // tanwin+alif, so this reuses the bare singular (forms[0], same word
    // used for the count=1 idiom's noun half) rather than forms[3]. When
    // that scale word is itself dual (200, 2000, ...), the same
    // construct-state relationship additionally strips its ن — see
    // toConstructStateDual().
    return `${toConstructStateDual(numberWords)} ${forms[0]}`;
  }
  return `${numberWords} ${forms[3]}`; // 11-99: singular accusative (tamyiz)
}

function arabicAmountToWords(major: number, minor: number): string {
  const parts: string[] = [];
  if (major > 0 || minor === 0) {
    parts.push(arabicUnitPhrase(major, AR_RIAL_FORMS, "masculine"));
  }
  if (minor > 0) {
    parts.push(arabicUnitPhrase(minor, AR_HALALA_FORMS, "feminine"));
  }
  return `${parts.join(" و")}.`;
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function englishAmountToWords(major: number, minor: number, majorNames: [string, string], minorNames: [string, string]): string {
  const parts: string[] = [];
  if (major > 0 || minor === 0) {
    parts.push(`${enCardinal(major)} ${major === 1 ? majorNames[0] : majorNames[1]}`);
  }
  if (minor > 0) {
    parts.push(`${enCardinal(minor)} ${minor === 1 ? minorNames[0] : minorNames[1]}`);
  }
  return `${capitalize(parts.join(" and "))}.`;
}

interface CurrencyWords {
  majorNames: [singular: string, plural: string];
  minorNames: [singular: string, plural: string];
  arabic?: {
    majorForms: ArabicNounForms;
    minorForms: ArabicNounForms;
  };
}

// SAR gets full linguistic rigor (verified against the project's locked
// ground truth). Other currencies are best-effort English pluralization
// only — genuinely correct Arabic noun agreement for each would need the
// same per-currency verification SAR just got, which is out of scope here.
const CURRENCY_WORDS: Record<string, CurrencyWords> = {
  SAR: {
    majorNames: ["riyal", "riyals"],
    minorNames: ["halala", "halalas"],
    arabic: { majorForms: AR_RIAL_FORMS, minorForms: AR_HALALA_FORMS },
  },
  AED: { majorNames: ["dirham", "dirhams"], minorNames: ["fils", "fils"] },
  USD: { majorNames: ["dollar", "dollars"], minorNames: ["cent", "cents"] },
  EUR: { majorNames: ["euro", "euros"], minorNames: ["cent", "cents"] },
  GBP: { majorNames: ["pound", "pounds"], minorNames: ["pence", "pence"] },
};

function splitMajorMinor(amount: DecimalInput): { major: number; minor: number } {
  const value = new Decimal(amount).abs();
  const totalMinorUnits = value.times(100).toDecimalPlaces(0).toNumber();
  return { major: Math.floor(totalMinorUnits / 100), minor: totalMinorUnits % 100 };
}

export interface AmountInWords {
  en: string;
  ar: string;
}

export function amountToWords(amount: DecimalInput, currencyCode: string): AmountInWords {
  const { major, minor } = splitMajorMinor(amount);
  const currency = CURRENCY_WORDS[currencyCode.toUpperCase()] ?? {
    majorNames: [currencyCode, currencyCode] as [string, string],
    minorNames: ["subunit", "subunits"] as [string, string],
  };

  const en = englishAmountToWords(major, minor, currency.majorNames, currency.minorNames);

  const ar = currency.arabic
    ? arabicAmountToWords(major, minor)
    : // Best-effort fallback for currencies without verified Arabic grammar:
      // cardinal number words + the raw ISO code, no noun-agreement attempt.
      `${fixArabicOrthography(arCardinal(major, { gender: "masculine" }))} ${currencyCode.toUpperCase()}${
        minor > 0 ? ` و${fixArabicOrthography(arCardinal(minor, { gender: "masculine" }))}/100` : ""
      }.`;

  return { en, ar };
}
