module.exports = {
  input: [
    'app/**/*.{ts,tsx,js,jsx}'
  ],
  lexers: {
    ts: ['JsxLexer'],
    tsx: ['JsxLexer'], 
    js: ['JsxLexer'],
    jsx: ['JsxLexer'],
    default: ['JsxLexer']
  },
  locales: ['en', 'si'],
  
  output: 'public/locales/$LOCALE.json',
  
  namespaceSeparator: false,
  keySeparator: false,
  
  keepRemoved: true,
  defaultValue: (lng, ns, key) => {
    return lng === 'en' ? key : ''; 
  }
};
