import { useLanguage } from "../context/LanguageContext";

const LanguageToggle = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`language-toggle ${compact ? "language-toggle-compact" : ""}`} role="group" aria-label="Select language">
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
      >
        EN
      </button>
      <button
        type="button"
        className={language === "hi" ? "active" : ""}
        onClick={() => setLanguage("hi")}
        aria-pressed={language === "hi"}
      >
        हिंदी
      </button>
    </div>
  );
};

export default LanguageToggle;
