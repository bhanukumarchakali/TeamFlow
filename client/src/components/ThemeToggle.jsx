import { useTheme } from "../context/useTheme";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const nextTheme = {
    light: "dark",
    dark: "system",
    system: "light",
  };

  const labels = {
    light: "Light",
    dark: "Dark",
    system: "System",
  };

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme[theme])}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      aria-label={`Current theme: ${labels[theme]}. Switch theme`}
      title={`Current theme: ${labels[theme]}`}
    >
      <span aria-hidden="true">
        {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🖥️"}
      </span>
      <span>{labels[theme]}</span>
    </button>
  );
};

export default ThemeToggle;