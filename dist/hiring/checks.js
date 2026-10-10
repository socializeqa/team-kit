/**
 * What the apply door checks in what a form sent, each rule on its own so it
 * is tested on its own: the age, the yes/no answers, the role's questions,
 * the draft's key, and who is knocking.
 */
import { MAX_QUESTIONS } from "./openings.js";
/**
 * The form's age, or null: a whole number within the bounds (18 to 70 by
 * default). Anything outside them is a typo, not an applicant.
 */
export function readAge(raw, { min = 18, max = 70 } = {}) {
    const typed = String(raw ?? "").trim();
    if (!/^\d{1,3}$/.test(typed))
        return null;
    const age = Number(typed);
    return age >= min && age <= max ? age : null;
}
/** Age bands for the list's filter, in the order a recruiter thinks. */
export const AGE_BANDS = [
    { value: "18-24", label: "18 to 24", from: 18, to: 24 },
    { value: "25-34", label: "25 to 34", from: 25, to: 34 },
    { value: "35-44", label: "35 to 44", from: 35, to: 44 },
    { value: "45+", label: "45 and over", from: 45, to: 80 },
];
/**
 * Whether a question is answered with a yes or a no, so the form offers two
 * buttons instead of a box: one question, opening the way such a question
 * does in English ("Do you…?", "Are you…?") or in Arabic ("هل…؟"). One that
 * asks two things, or wants words, stays written.
 */
export function asksYesNo(prompt) {
    const asked = prompt.trim();
    if ((asked.match(/[?؟]/g) ?? []).length !== 1 || !/[?؟]$/.test(asked))
        return false;
    return /^(do|does|did|are|is|was|were|have|has|had|can|could|will|would|should|may)\s/i.test(asked) || /^هل\s/.test(asked);
}
/** A yes/no field as the form sent it: yes, no, or null when it was never asked. */
export function readYesNo(raw) {
    const said = String(raw ?? "").trim().toLowerCase();
    return said === "yes" ? true : said === "no" ? false : null;
}
/** The answers as the form sent them, by the question's place; only the words are taken. */
export function readAnswers(raw, max = MAX_QUESTIONS) {
    try {
        const parsed = JSON.parse(raw || "[]");
        if (!Array.isArray(parsed))
            return [];
        return parsed.slice(0, max).map((entry) => String(entry?.answer ?? "").trim().slice(0, 2000));
    }
    catch {
        return [];
    }
}
/**
 * The role's questions with the answers beside them, or null when one is
 * missing. The question's words are the opening's own, never the browser's: a
 * form could otherwise rewrite what the office and the AI reader see as the
 * question. Every question needs an answer, and a yes/no one a Yes or a No.
 */
export function pairAnswers(questions, given) {
    const paired = questions.slice(0, MAX_QUESTIONS).map((q, i) => ({ prompt: q.prompt, answer: given[i] ?? "" }));
    const right = paired.every(({ prompt, answer }) => (asksYesNo(prompt) ? answer === "Yes" || answer === "No" : answer.length > 0));
    return right ? paired : null;
}
/** The one key a draft sends with every press of Send, so a double press files one application. */
export function readKey(value) {
    const key = typeof value === "string" ? value.trim() : "";
    return /^[\w-]{8,64}$/.test(key) ? key : null;
}
/**
 * The visitor's address as sent. Behind Vercel the platform writes
 * x-forwarded-for itself, so a caller cannot choose it; elsewhere, trust it
 * only behind a proxy that does the same.
 */
export function callerIp(headers) {
    return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
}
/**
 * The address a door counts tries by. An IPv4 address is one place; an IPv6
 * one is counted by its /64, the block a single home or phone is handed,
 * since one device can rotate through the rest of it and walk past a
 * per-address limit. An IPv4 address wrapped in IPv6 (::ffff:1.2.3.4) is its
 * IPv4 self.
 */
export function callerBucket(headers) {
    const ip = callerIp(headers);
    if (!ip.includes(":"))
        return ip;
    const v4 = /(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
    if (v4?.[1])
        return v4[1];
    const [head, tail] = ip.toLowerCase().split("::");
    const front = head ? head.split(":") : [];
    const back = tail === undefined ? [] : tail ? tail.split(":") : [];
    const groups = tail === undefined ? front : [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill("0"), ...back];
    return `${groups
        .slice(0, 4)
        .map((group) => group.padStart(4, "0"))
        .join(":")}::/64`;
}
