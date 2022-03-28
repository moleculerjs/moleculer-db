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
	"overrides": [
		// typescript
		{
			"files": ["*.ts", "*.tsx"],
			"parser": "@typescript-eslint/parser",
			"plugins": ["@typescript-eslint"],
			"extends": ["plugin:@typescript-eslint/recommended"],
			"rules": {
				"@typescript-eslint/ban-types": "off",
				// "prettier/prettier": "off",
				"@typescript-eslint/ban-ts-comment": "off",
				"@typescript-eslint/no-explicit-any": "off"
				// '@typescript-eslint/explicit-module-boundary-types': 'off',
			}
		}
	],
	"rules": {
		"indent": [
			"warn",
			"tab",
			{ SwitchCase: 1 }
		],
		"quotes": [
			"warn",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"no-var": [
			"error"
		],
		"no-console": [
			"off"
		],
		"no-unused-vars": [
			"warn"
		]
	}
};
