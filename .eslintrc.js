module.exports = {
	root: true,
	"env": {
		"node": true,
		"commonjs": true,
		"es6": true,
		"jquery": false,
		"jest": true,
		"jasmine": true
	},
	"extends": "eslint:recommended",
	"parserOptions": {
		"sourceType": "module",
		"ecmaVersion": "2018"
	},
	overrides: [
		// typescript
		{
			files: ["*.ts", "*.tsx"],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			extends: [
				"plugin:@typescript-eslint/recommended",
			],
			rules: {
				"@typescript-eslint/ban-ts-comment": "off",
				"@typescript-eslint/member-delimiter-style": ["error", {
					multiline: {
						delimiter: "none",
						requireLast: false,
					},
					singleline: {
						delimiter: "comma",
						requireLast: false,
					},
					// overrides: {
					//   interface: {
					//     multiline: {
					//       delimiter: 'none',
					//       requireLast: false
					//     }
					//   }
					// }
				}],
				"@typescript-eslint/no-explicit-any": "off",
				"@typescript-eslint/type-annotation-spacing": ["warn", {
					before: false,
					after: true,
				}],
			},
			overrides: [
				{
					files: ["*.d.ts"],
					rules: {
						"prettier/prettier": "off",
						"no-use-before-define": "off",
						"@typescript-eslint/explicit-module-boundary-types": "off",
						"@typescript-eslint/no-unused-vars": "off",
						"@typescript-eslint/ban-types": "off",
						// '@typescript-eslint/adjacent-overload-signatures': 'off',
					},
				},
			],
		},
	],
};
