import { FAQ_QUESTIONS } from "@/data/contact-data";

/**
 * Questions only, no answer copy — several touch unconfirmed claims (COD,
 * pan-India shipping, delivery timeframes) that must not be asserted until
 * confirmed. See docs/DESIGN_SYSTEM.md §18.
 */
export function CommonQuestions() {
  return (
    <section className="section-block !pt-0 bg-cream-bg">
      <div className="site-container">
        <h2 className="display-heading text-2xl text-text-primary sm:text-3xl">
          Common questions
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FAQ_QUESTIONS.map((question) => (
            <li
              key={question}
              className="body-copy flex items-center gap-2 rounded-[var(--radius-card)] bg-white px-5 py-4 text-text-primary"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-orange" aria-hidden="true" />
              {question}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
