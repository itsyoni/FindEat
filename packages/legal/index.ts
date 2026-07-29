import type { LegalSection } from "@findeat/types";

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  introduction: string[];
  sections: LegalSection[];
};

export const LEGAL_URLS = {
  privacy: "https://findeat.space/privacy",
  terms: "https://findeat.space/terms",
  accountDeletion: "https://findeat.space/account-deletion",
} as const;

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "FindEat Terms of Service",
  effectiveDate: "July 29, 2026",
  introduction: [
    'These Terms of Service ("Terms") govern your use of the FindEat mobile application, website, restaurant-management tools, and related services (collectively, the "Service").',
    "By creating an account, accessing, or using the Service, you agree to these Terms. If you do not agree, do not use the Service.",
  ],
  sections: [
    {
      title: "1. Eligibility",
      paragraphs: [
        "You must be at least 13 years old and old enough to consent to the processing of your personal information under the laws that apply to you. If local law requires consent from a parent or guardian, you may use the Service only with that consent.",
        "The Service is not directed to children under 13.",
      ],
    },
    {
      title: "2. Accounts and security",
      paragraphs: [
        "You must provide accurate information, keep your login credentials secure, and promptly update information that changes.",
        "You are responsible for activity performed through your account. Tell us promptly if you believe your account has been accessed without permission.",
      ],
      bullets: [
        "Do not impersonate another person, restaurant, or organization.",
        "Do not create accounts to mislead, evade enforcement, or abuse the Service.",
        "Do not sell, rent, or transfer your account without our written permission.",
      ],
    },
    {
      title: "3. Restaurant profiles and business accounts",
      paragraphs: [
        "Restaurant information may come from restaurant owners, public sources, third-party place providers, and community contributions. A restaurant representative may request to claim a restaurant profile and may be asked to provide verification information.",
        "A claimed restaurant may publish official content and manage business information, menus, and messages. Claim approval does not mean that FindEat endorses the restaurant or guarantees the accuracy of its information.",
      ],
    },
    {
      title: "4. Your content",
      paragraphs: [
        "You retain ownership of the photos, videos, reviews, captions, comments, messages, menu information, and other material you submit to the Service.",
        "You grant FindEat a worldwide, non-exclusive, royalty-free, sublicensable license to host, store, reproduce, display, format, transmit, and distribute your content only as needed to operate, improve, secure, and promote the Service. This license is subject to your privacy and visibility choices and ends when the content is deleted, except where copies must remain for a limited time in backups or where content was lawfully shared and retained by another user.",
        "You represent that you have the rights and permissions needed to submit your content and to grant this license.",
      ],
    },
    {
      title: "5. Reviews and recommendations",
      paragraphs: [
        "Reviews must reflect genuine experiences and honest opinions. Ratings, recommendation points, creator levels, tags, and other community signals are features of the Service and are not professional endorsements.",
      ],
      bullets: [
        "Do not post a fabricated review or manipulate a rating.",
        "Disclose a material relationship, free meal, payment, or other incentive connected to a review.",
        "Do not threaten, harass, or demand benefits from a restaurant or user in exchange for changing content.",
      ],
    },
    {
      title: "6. Community rules",
      paragraphs: ["You may not use the Service to:"],
      bullets: [
        "Post hate speech, credible threats, sexual exploitation, unlawful pornography, or content that promotes violence.",
        "Harass, stalk, bully, defame, or expose another person's private information.",
        "Infringe intellectual-property, privacy, publicity, or other rights.",
        "Distribute malware, spam, scams, unauthorized advertising, or deceptive content.",
        "Scrape, reverse engineer, disrupt, overload, or gain unauthorized access to the Service.",
        "Use the Service for unlawful activity or to help another person violate these Terms.",
      ],
    },
    {
      title: "7. Moderation, reports, and enforcement",
      paragraphs: [
        "Users can report content, accounts, restaurants, and conduct. We may review reports, restrict distribution, remove content, reject restaurant claims, limit features, suspend accounts, or terminate accounts when reasonably necessary to protect users, the Service, or third parties.",
        "We are not required to monitor every item of content and cannot guarantee that objectionable or inaccurate content will never appear.",
      ],
    },
    {
      title: "8. Intellectual property",
      paragraphs: [
        "The Service, including its software, design, branding, and FindEat name and logo, is owned by or licensed to FindEat and is protected by applicable law.",
        "These Terms do not give you permission to copy, modify, distribute, sell, or reverse engineer the Service except where applicable law does not allow that restriction.",
      ],
    },
    {
      title: "9. Maps, restaurant information, food, and allergens",
      paragraphs: [
        "Restaurant addresses, opening hours, menus, prices, ratings, dietary tags, allergen indicators, and map information may be incomplete, delayed, or inaccurate. Restaurants can change ingredients and preparation methods without updating FindEat.",
        "FindEat does not provide medical, nutritional, food-safety, or allergy advice. Always confirm critical information directly with the restaurant, particularly if you have an allergy or dietary restriction.",
      ],
    },
    {
      title: "10. Third-party services",
      paragraphs: [
        "The Service may display information from or link to third-party services, maps, websites, app stores, or restaurants. Their services and terms are separate from ours, and FindEat is not responsible for third-party content or practices.",
      ],
    },
    {
      title: "11. Account deactivation and deletion",
      paragraphs: [
        "You may temporarily deactivate your account or permanently delete it from the account settings. Deactivation hides your account while retaining its data so you can reactivate it.",
        "Account deletion removes your profile, posts, reviews, media, social activity, and restaurant-management access. Messages are deleted and comments are stripped of their content so other conversations and threads remain structurally understandable. Limited records may be retained when required for security, fraud prevention, dispute resolution, or legal compliance.",
      ],
    },
    {
      title: "12. Service changes and availability",
      paragraphs: [
        "We may update, add, restrict, or discontinue features. We do not guarantee that the Service will always be available, error-free, or compatible with every device.",
        "We may offer paid features in the future. Any price and additional terms will be shown before purchase.",
      ],
    },
    {
      title: "13. Disclaimers",
      paragraphs: [
        'To the fullest extent permitted by law, the Service is provided "as is" and "as available." FindEat disclaims implied warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy.',
        "Nothing in these Terms excludes a warranty or right that cannot lawfully be excluded.",
      ],
    },
    {
      title: "14. Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by law, FindEat will not be liable for indirect, incidental, special, consequential, or punitive damages, loss of data, lost profits, restaurant experiences, food safety issues, or harm caused by another user or third party.",
        "These limitations do not apply where liability cannot be limited under applicable law.",
      ],
    },
    {
      title: "15. Changes to these Terms",
      paragraphs: [
        "We may update these Terms as the Service or law changes. We will update the effective date and provide additional notice when a change materially affects your rights. Continuing to use the Service after the updated Terms take effect means you accept them.",
      ],
    },
    {
      title: "16. Governing law",
      paragraphs: [
        "These Terms are governed by the laws of the State of Israel, without regard to conflict-of-law rules. Courts with jurisdiction in Tel Aviv-Jaffa, Israel will have jurisdiction, except where consumer law gives you the right to bring a claim elsewhere.",
      ],
    },
    {
      title: "17. Contact",
      paragraphs: [
        "Questions about these Terms may be sent to legal@findeat.space.",
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: "FindEat Privacy Policy",
  effectiveDate: "July 23, 2026",
  introduction: [
    'This Privacy Policy explains how FindEat ("FindEat", "we", "us", or "our") collects, uses, shares, and protects information when you use the FindEat mobile application, website, restaurant-management tools, and related services (collectively, the "Service").',
    "FindEat is based in Israel. This policy applies to users, restaurant representatives, and visitors to our public web pages.",
  ],
  sections: [
    {
      title: "1. Information you provide",
      paragraphs: ["Depending on how you use FindEat, you may provide:"],
      bullets: [
        "Account information, including email address, username, display name, encrypted password, language, and account settings.",
        "Optional profile information, including biography, profile and cover images, birthday, pronouns, allergies, dietary restrictions, food preferences, and favorite cuisines.",
        "User content, including posts, reviews, ratings, photos, videos, captions, snaps, comments, replies, polls, saved places, folders, and drafts.",
        "Communications, including direct and group messages, mentions, support requests, reports, and responses to notifications.",
        "Restaurant and business information, including menus, dishes, prices, opening hours, contact details, photos, claim evidence, ownership information, and address-change requests.",
      ],
    },
    {
      title: "2. Information collected automatically",
      paragraphs: [
        "When you use the Service, our systems and service providers may automatically process technical and activity information.",
      ],
      bullets: [
        "Device type, operating system, language, app version, and basic identifiers needed for app operation.",
        "IP address, request timestamps, server logs, security events, and diagnostic or crash information.",
        "Usage activity, such as pages and features viewed, searches, follows, likes, saves, visits, message-delivery and read status, and notification interactions.",
        "Push-notification tokens and notification preferences.",
        "Cookies or similar local-storage technologies on the website to keep you signed in, remember settings, secure sessions, and understand service performance.",
      ],
    },
    {
      title: "3. Device permissions",
      paragraphs: [
        "FindEat requests device access only when it supports a feature you choose to use. You can manage permissions in FindEat settings and your device settings.",
      ],
      bullets: [
        "Location: with permission, precise or approximate location may be processed to show nearby restaurants, calculate distance, center the map, and improve local suggestions. You can search manually without location access.",
        "Camera: used when you choose to capture a post, review, snap, dish, profile, or restaurant image.",
        "Photos and media library: used when you choose an existing image or video to upload.",
        "Notifications: used to deliver messages, activity, security, restaurant, and product-update notifications according to your choices.",
      ],
    },
    {
      title: "4. How we use information",
      bullets: [
        "Create, authenticate, secure, and administer accounts.",
        "Display profiles and content according to account, post, and visibility settings.",
        "Provide feeds, maps, restaurant pages, menus, messaging, folders, recommendations, creator attribution, levels, and tags.",
        "Process restaurant claims and provide restaurant-management tools.",
        "Send verification codes, password resets, service messages, push notifications, and product updates.",
        "Personalize restaurant and dish suggestions using location and voluntarily provided food preferences.",
        "Provide support, respond to reports, moderate content, prevent abuse, and enforce our Terms.",
        "Maintain, troubleshoot, analyze, and improve the Service.",
        "Comply with legal obligations and protect users, FindEat, and third parties.",
      ],
    },
    {
      title: "5. Legal bases",
      paragraphs: [
        "Where applicable law requires a legal basis, we process information to perform our agreement with you, with your consent, to comply with legal obligations, and for legitimate interests such as operating, securing, improving, and preventing abuse of the Service. You may withdraw consent for optional processing through your settings or device permissions.",
      ],
    },
    {
      title: "6. How information is shared",
      paragraphs: [
        "We do not sell personal information. We share information only as described below.",
      ],
      bullets: [
        "With other users: profile details and content are shown according to your account and post visibility. Messages are shared with their recipients. Public restaurant reviews and aggregated activity may be visible to restaurant representatives.",
        "With collaborators: information in a shared folder, group conversation, or jointly managed restaurant is visible to authorized participants.",
        "With service providers: vendors process data for hosting, databases, media storage, email, maps and place search, push notifications, app distribution, web hosting, security, and support. These include providers such as Railway, Neon, Cloudflare, Resend, Mapbox, Google, Apple, Expo, and Vercel, as applicable.",
        "For legal and safety reasons: information may be disclosed when reasonably necessary to comply with law, respond to lawful requests, investigate fraud or abuse, enforce our Terms, or protect rights and safety.",
        "Business changes: information may be transferred as part of a merger, financing, acquisition, reorganization, or sale of assets, subject to appropriate safeguards.",
      ],
    },
    {
      title: "7. Public and private content",
      paragraphs: [
        "Public content may be seen and shared by anyone. Friends-only content is limited to eligible mutual connections, and private content is intended only for you, subject to necessary processing by FindEat and its service providers.",
        "Private messages are visible to conversation participants and are processed by our systems to deliver the conversation, support safety features, and respond to valid reports or legal requirements.",
      ],
    },
    {
      title: "8. Retention, deactivation, and deletion",
      paragraphs: [
        "We retain information while your account is active and as needed to provide the Service. A deactivated account remains stored so it can be reactivated, while its profile and content are hidden.",
        "Snaps are visible for up to 24 hours. Expired snap records and their uploaded media are removed through automated cleanup when the Service is active.",
        "When you permanently delete your account, FindEat removes your profile details, posts, reviews, snaps, uploaded profile and content media, follows, saves, notifications, support requests, and restaurant-management access. Messages are marked deleted and comments are cleared so other users' conversations and threads remain understandable without identifying you.",
        "Temporary copies may remain in backups until they are overwritten. We may retain limited security, fraud-prevention, transaction, or legal records when reasonably necessary or required by law.",
      ],
    },
    {
      title: "9. Your choices and rights",
      paragraphs: [
        "Depending on applicable law, you may have rights to access, review, correct, delete, restrict, object to, or receive a copy of personal information. You may also withdraw consent where processing is based on consent.",
      ],
      bullets: [
        "Edit profile and visibility choices in the app.",
        "Manage location, camera, photo-library, and notification permissions in app or device settings.",
        "Change notification, activity-status, private-account, language, and appearance preferences.",
        "Deactivate or permanently delete your account from Settings → Password and security.",
        "Request help with a privacy right by emailing privacy@findeat.space.",
      ],
    },
    {
      title: "10. International processing",
      paragraphs: [
        "FindEat and its providers may process information in Israel, the European Economic Area, the United States, and other countries. Where required, we use appropriate contractual or legal safeguards for international transfers.",
      ],
    },
    {
      title: "11. Security",
      paragraphs: [
        "We use reasonable administrative, technical, and organizational measures designed to protect information, including encrypted network transport, hashed passwords, access controls, and restricted storage credentials. No internet service can guarantee absolute security.",
      ],
    },
    {
      title: "12. Children",
      paragraphs: [
        "FindEat is not directed to children under 13, and we do not knowingly collect personal information from a child under 13. If you believe a child has provided information contrary to this policy, contact privacy@findeat.space.",
      ],
    },
    {
      title: "13. Changes to this policy",
      paragraphs: [
        "We may update this policy as our Service or legal obligations change. We will update the effective date and provide additional notice when a change materially affects your privacy rights.",
      ],
    },
    {
      title: "14. Contact",
      paragraphs: [
        "For privacy questions or requests, email privacy@findeat.space.",
        "For general support, use Help and support inside the app.",
      ],
    },
  ],
};
