/**
 * The careers form starts with the CV: once it lands in storage, a model reads
 * the person's own details off it, so they check them instead of typing them.
 * The model's answer is checked field by field here before the form sees it;
 * what fails a check is simply left for the person to type.
 *
 * Zero dependencies: the app hands in how it reads a phone number (most use
 * libphonenumber-js), and which country codes it knows.
 */
import { askViaHq, MODELS } from "../ai.js";
import { readAge } from "./checks.js";
export const FILL_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["first_name", "last_name", "email", "phone", "birth_date", "age", "nationality"],
    properties: {
        first_name: { type: "string", description: "Given name as written on the CV, or an empty string." },
        last_name: { type: "string", description: "Family name as written on the CV, or an empty string." },
        email: { type: "string", description: "The person's own email address, or an empty string." },
        phone: { type: "string", description: "The person's mobile number with its country code if shown (e.g. +44 20 7946 0018), or an empty string." },
        birth_date: { type: "string", description: "Date of birth as YYYY-MM-DD, or YYYY when only the year is shown, or an empty string." },
        age: { type: "integer", description: "An age the CV states outright when there is no date of birth, otherwise 0." },
        nationality: { type: "string", description: "Nationality as an ISO 3166-1 alpha-2 code (e.g. LB, IN, QA), or an empty string. Never guess it from a name or a place of work." },
    },
};
export const FILL_SYSTEM = "You read a CV and copy the applicant's own details off it for a job application form. Copy only what the CV states about the applicant; never guess, never infer from a name, a photo or where they worked, and never take a referee's or an employer's details. Leave a field empty when the CV does not say.";
const named = (() => {
    let namer = null;
    return (iso) => {
        try {
            namer ??= new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
            return Boolean(namer.of(iso));
        }
        catch {
            return false;
        }
    };
})();
// A name a CV sets in capitals ("MOHAMED AL-SAYED") is written the way a person signs it.
function name(raw) {
    const typed = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!/\p{L}/u.test(typed))
        return undefined;
    if (typed !== typed.toUpperCase())
        return typed;
    return typed.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, gap, letter) => gap + letter.toUpperCase());
}
function ageFrom(birth, stated, today) {
    const date = /^(\d{4})(?:-(\d{2})-(\d{2}))?$/.exec(birth.trim());
    if (date) {
        const [, year, month, day] = date;
        let age = today.getUTCFullYear() - Number(year);
        // Before this year's birthday, a year younger; a bare year counts as already passed.
        if (month && (today.getUTCMonth() + 1 < Number(month) || (today.getUTCMonth() + 1 === Number(month) && today.getUTCDate() < Number(day))))
            age -= 1;
        return readAge(String(age)) === null ? undefined : String(age);
    }
    return readAge(String(stated)) === null ? undefined : String(stated);
}
/** The model's read, checked field by field. */
export function cleanFill(raw, today, checks) {
    const found = {};
    const first = name(raw.first_name ?? "");
    if (first)
        found.first_name = first;
    const last = name(raw.last_name ?? "");
    if (last)
        found.last_name = last;
    const email = (raw.email ?? "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120)
        found.email = email;
    const phone = raw.phone?.trim() ? checks.toPhone(raw.phone) : null;
    if (phone)
        found.phone = phone;
    const age = ageFrom(raw.birth_date ?? "", Number(raw.age) || 0, today);
    if (age)
        found.age = age;
    const nationality = (raw.nationality ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(nationality) && (checks.isCountry ?? named)(nationality))
        found.nationality = nationality;
    return found;
}
/**
 * Reads a CV through Socialize HQ (billed to the app's client as "CV form
 * fill"): the quick model first, the careful one if it fails. `url` is a
 * short-lived signed link to the PDF. Null when nothing came back; the form
 * then simply asks.
 */
export async function readCvFill(hq, { url, today = new Date(), models = [MODELS.fast, MODELS.careful], ...checks }) {
    const raw = await askViaHq(hq, {
        purpose: "CV form fill",
        models,
        system: FILL_SYSTEM,
        prompt: "Copy the applicant's details off the attached CV.",
        schema: FILL_SCHEMA,
        schemaName: "cv_fill",
        maxTokens: 300,
        timeoutMs: 30_000,
        files: [{ filename: "cv.pdf", url }],
    });
    return raw ? cleanFill(raw, today, checks) : null;
}
