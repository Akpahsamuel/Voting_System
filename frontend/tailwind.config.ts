import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		fontFamily: {
			sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
			audiowide: ["Audiowide", "cursive"],
			mono: ["Roboto Mono", "monospace"],
			tech: ["Audiowide", "monospace"],
		},
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					primary: "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"fade-in": {
					"0%": {
						opacity: "0",
						transform: "translateY(20px)",
					},
					"100%": {
						opacity: "1",
						transform: "translateY(0)",
					},
				},
				"fade-out": {
					"0%": {
						opacity: "1",
						transform: "translateY(0)",
					},
					"100%": {
						opacity: "0",
						transform: "translateY(20px)",
					},
				},
				"scale-in": {
					"0%": {
						transform: "scale(0.95)",
						opacity: "0",
					},
					"100%": {
						transform: "scale(1)",
						opacity: "1",
					},
				},
				"pulse-glow": {
					"0%, 100%": {
						opacity: "1",
						boxShadow: "0 0 10px 2px rgba(101, 85, 255, 0.3)",
					},
					"50%": {
						opacity: "0.8",
						boxShadow: "0 0 20px 5px rgba(101, 85, 255, 0.6)",
					},
				},
				flow: {
					"0%": { backgroundPosition: "0% 50%" },
					"50%": { backgroundPosition: "100% 50%" },
					"100%": { backgroundPosition: "0% 50%" },
				},
				float: {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-10px)" },
				},
				"count-up": {
					"0%": { content: '"0"' },
					"20%": { content: '"1"' },
					"40%": { content: '"2"' },
					"60%": { content: '"3"' },
					"80%": { content: '"4"' },
					"100%": { content: '"5"' },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"fade-in": "fade-in 0.7s ease-out",
				"fade-out": "fade-out 0.3s ease-out",
				"scale-in": "scale-in 0.3s ease-out",
				"pulse-glow": "pulse-glow 2s ease-in-out infinite",
				flow: "flow 6s ease infinite",
				float: "float 3s ease-in-out infinite",
				"count-up": "count-up 2s linear forwards",
			},
			backgroundImage: {
				"gradient-sui": "linear-gradient(to right, #0096FF, #7B61FF)",
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"grid-pattern":
					"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1zm1 1h36v36H2V2z' fill='%236366f1' fill-opacity='0.04' fill-rule='evenodd'/%3E%3C/svg%3E\")",
			},
		},
		},
	plugins: [tailwindcssAnimate],
} satisfies Config;
