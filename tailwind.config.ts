import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            backdropBlur: {
                xs: '2px',
            },
            backgroundColor: {
                'glass': 'rgba(30, 30, 40, 0.6)',
            },
            borderColor: {
                'glass': 'rgba(255, 255, 255, 0.1)',
            }
        },
    },
    plugins: [],
};

export default config;