import globals from "globals";
import pluginJs from "@eslint/js";

export default [
    pluginJs.configs.recommended,
    {
        ignores: [
            "coverage/**",
            "node_modules/**",
            "gh-pages/**",
        ],
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                // cross-file globals injected by item_detail.js into the browser scope
                "base_url": "readonly",
                "base_path": "readonly",
                "igdbImageUrl": "readonly",
                "getRegionFlag": "readonly",
                "makeBadge": "readonly",
                "addDlRow": "readonly",
                "loadItemDetail": "readonly",
                "renderGameList": "readonly",
                "splitString": "readonly",
                "require": "readonly",
            },
        },
    },
];
