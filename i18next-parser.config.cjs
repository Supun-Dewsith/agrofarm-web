module.exports = {
  input: ['app/**/*.{js,jsx,ts,tsx}'],
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
    js: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    default: ['JavascriptLexer']
  },
  locales: ['en', 'si'],
  
  // Make sure it saves to the exact public/locales path
  output: 'public/locales/$LOCALE.json', 
  
  keepRemoved: true,
  defaultValue: (lng, ns, key) => {
    return lng === 'en' ? key : '';
  }
};
