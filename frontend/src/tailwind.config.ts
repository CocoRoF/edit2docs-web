import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                // Korean-first font stack mirroring strategist.en.md §K.1 with
                // the system fallbacks edge browsers always have available.
                sans: [
                    "Pretendard",
                    '"Pretendard Variable"',
                    '"Apple SD Gothic Neo"',
                    '"Malgun Gothic"',
                    '"Noto Sans KR"',
                    "system-ui",
                    "-apple-system",
                    "sans-serif",
                ],
                mono: [
                    '"D2 Coding"',
                    '"JetBrains Mono"',
                    "Consolas",
                    '"Courier New"',
                    "monospace",
                ],
            },
            colors: {
                // Toss-blue–ish primary used in the strategist's K-startup
                // minimal palette. Defaults can be overridden per page.
                primary: {
                    50: "#EAF3FF",
                    100: "#D5E7FF",
                    200: "#AACFFF",
                    300: "#80B7FF",
                    400: "#359EFF",
                    500: "#0064FF",
                    600: "#0050CC",
                    700: "#003C99",
                    800: "#002866",
                    900: "#001433",
                },
            },
        },
    },
    plugins: [],
};

export default config;
