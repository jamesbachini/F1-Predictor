import { ThemeToggle } from "../ThemeToggle";
import { ThemeProvider } from "@/context/ThemeContext";

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <span className="text-sm text-muted-foreground">Click to toggle theme</span>
      </div>
    </ThemeProvider>
  );
}
