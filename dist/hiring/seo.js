/**
 * Google's JobPosting for a role page, so the role can appear in job search
 * (developers.google.com/search/docs/appearance/structured-data/job-posting).
 * `validThrough` rolls thirty days forward while the role stays open; the page
 * drops the markup the day the role closes, and a ping tells Google
 * (team-kit `search`).
 */
const TYPE = { full_time: "FULL_TIME", part_time: "PART_TIME", freelance: "CONTRACTOR", internship: "INTERN" };
export function jobPostingLd(role, org, now = new Date()) {
    const list = (items) => items.map((item) => `• ${item}`).join("\n");
    const pay = role.pay.min || role.pay.max;
    return {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: role.title,
        description: [role.description, list(role.responsibilities), list(role.requirements)].filter(Boolean).join("\n\n"),
        ...(role.responsibilities.length ? { responsibilities: role.responsibilities.join("\n") } : {}),
        ...(role.requirements.length ? { qualifications: role.requirements.join("\n") } : {}),
        datePosted: role.postedAt.slice(0, 10),
        validThrough: new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10),
        employmentType: TYPE[role.employmentType] ?? "FULL_TIME",
        directApply: true,
        inLanguage: role.locale,
        identifier: { "@type": "PropertyValue", name: org.name, value: role.slug },
        ...(pay
            ? {
                baseSalary: {
                    "@type": "MonetaryAmount",
                    currency: org.currency,
                    value: {
                        "@type": "QuantitativeValue",
                        ...(role.pay.min && role.pay.max ? { minValue: role.pay.min, maxValue: role.pay.max } : { value: pay }),
                        unitText: "MONTH",
                    },
                },
            }
            : {}),
        url: role.url,
        hiringOrganization: { "@type": "Organization", name: org.name, sameAs: org.url, ...(org.logo ? { logo: org.logo } : {}) },
        jobLocation: {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                ...(org.address.street ? { streetAddress: org.address.street } : {}),
                addressLocality: org.address.locality,
                ...(org.address.region ? { addressRegion: org.address.region } : {}),
                addressCountry: org.address.country,
            },
        },
    };
}
/** The markup as it goes in a <script type="application/ld+json">, with "<" escaped so a role's words can never close the tag. */
export const ldScript = (data) => JSON.stringify(data).replace(/</g, "\\u003c");
