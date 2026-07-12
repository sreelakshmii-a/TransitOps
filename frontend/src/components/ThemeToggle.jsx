import { useTheme } from "../context/ThemeContext";
import { IconSun, IconMoon } from "./icons";

// Fixed top-right, present on every page (including Login) since theme is a
// global preference, not tied to being logged in.
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle color theme"
    >
      <span className={"theme-toggle-thumb" + (isDark ? "" : " light")}>
        {isDark ? <IconMoon width={13} height={13} /> : <IconSun width={13} height={13} />}
      </span>
    </button>
  );
}
