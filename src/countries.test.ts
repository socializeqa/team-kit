import { describe, expect, it } from "vitest";
import { countryByName, countryName, matchesCountry, namedCountries } from "./countries.js";
import { readSource, sourceLabel } from "./source.js";

const CODES = [
  { iso: "LB", dial: "961" },
  { iso: "QA", dial: "974" },
  { iso: "AE", dial: "971" },
  { iso: "PS", dial: "970" },
];

describe("countries", () => {
  it("names a country in each language, Palestine as people say it", () => {
    expect(countryName("LB", "en")).toBe("Lebanon");
    expect(countryName("PS", "en")).toBe("Palestine");
    expect(countryName("PS", "ar")).toBe("فلسطين");
  });

  it("puts the home country first and the rest in order", () => {
    expect(namedCountries(CODES, "en").map((c) => c.iso)).toEqual(["QA", "LB", "PS", "AE"]);
  });

  it("answers to a name, an old name, a code or a dialling code", () => {
    const [, uae] = namedCountries(CODES, "en").filter((c) => c.iso === "QA" || c.iso === "AE");
    expect(uae && matchesCountry(uae, "uae")).toBe(true);
    expect(uae && matchesCountry(uae, "+971")).toBe(true);
    expect(uae && matchesCountry(uae, "emir")).toBe(true);
    expect(uae && matchesCountry(uae, "lebanon")).toBe(false);
  });

  it("finds the code of a stored English name", () => {
    const named = namedCountries(CODES, "en");
    expect(countryByName("Lebanon", named)).toBe("LB");
    expect(countryByName("UAE", named)).toBe("AE");
    expect(countryByName("Atlantis", named)).toBeNull();
  });
});

describe("visit source", () => {
  it("keeps only the known tags, trimmed to size", () => {
    expect(readSource(JSON.stringify({ utm_source: "linkedin", evil: "x", referrer: "" }))).toEqual({ utm_source: "linkedin" });
    expect(readSource("not json")).toBeNull();
    expect(readSource(JSON.stringify(["x"]))).toBeNull();
  });

  it("says it in words", () => {
    expect(sourceLabel({ utm_source: "ig", utm_medium: "paid", utm_campaign: "hiring-oct" })).toBe("Instagram ad · hiring oct");
    expect(sourceLabel({ referrer: "https://www.linkedin.com/jobs/view/1" })).toBe("LinkedIn");
    expect(sourceLabel(null)).toBe("Direct");
  });
});
