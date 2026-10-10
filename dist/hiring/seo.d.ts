/**
 * Google's JobPosting for a role page, so the role can appear in job search
 * (developers.google.com/search/docs/appearance/structured-data/job-posting).
 * `validThrough` rolls thirty days forward while the role stays open; the page
 * drops the markup the day the role closes, and a ping tells Google
 * (team-kit `search`).
 */
export type PostingRole = {
    slug: string;
    title: string;
    description: string;
    responsibilities: readonly string[];
    requirements: readonly string[];
    employmentType: string;
    postedAt: string;
    /** Monthly pay as figures, when the role shows it. */
    pay: {
        min: number | null;
        max: number | null;
    };
    /** The page's own address. */
    url: string;
    /** The page's language ("en", "ar"). */
    locale: string;
};
export type PostingOrg = {
    name: string;
    url: string;
    logo?: string;
    address: {
        street?: string;
        locality: string;
        region?: string;
        country: string;
    };
    /** "QAR" */
    currency: string;
};
export declare function jobPostingLd(role: PostingRole, org: PostingOrg, now?: Date): {
    url: string;
    hiringOrganization: {
        logo?: string | undefined;
        "@type": string;
        name: string;
        sameAs: string;
    };
    jobLocation: {
        "@type": string;
        address: {
            addressCountry: string;
            addressRegion?: string | undefined;
            addressLocality: string;
            streetAddress?: string | undefined;
            "@type": string;
        };
    };
    baseSalary?: {
        "@type": string;
        currency: string;
        value: {
            unitText: string;
            minValue: number;
            maxValue: number;
            "@type": string;
        } | {
            unitText: string;
            value: number;
            "@type": string;
        };
    } | undefined;
    datePosted: string;
    validThrough: string;
    employmentType: string;
    directApply: boolean;
    inLanguage: string;
    identifier: {
        "@type": string;
        name: string;
        value: string;
    };
    qualifications?: string | undefined;
    responsibilities?: string | undefined;
    "@context": string;
    "@type": string;
    title: string;
    description: string;
};
/** The markup as it goes in a <script type="application/ld+json">, with "<" escaped so a role's words can never close the tag. */
export declare const ldScript: (data: unknown) => string;
