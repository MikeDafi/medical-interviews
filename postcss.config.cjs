const purgecss = require('@fullhuman/postcss-purgecss');
const autoprefixer = require('autoprefixer');

module.exports = {
  plugins: [
    autoprefixer(),
    // Only purge in production builds
    purgecss({
      content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
      // Safelist classes that are dynamically generated
      safelist: {
        standard: [
          'active',
          'selected',
          'disabled',
          'open',
          'closed',
          'expanded',
          'collapsed',
          'loading',
          'error',
          'success',
          'visible',
          'hidden',
        ],
        // Keep classes that match these patterns
        deep: [
          /^modal/,
          /^profile/,
          /^calendar/,
          /^admin/,
          /^packages/,
          /^payment/,
          /^auth/,
          /^hero/,
          /^header/,
          /^footer/,
          /^btn/,
          /^cta/,
          /^form/,
          /^input/,
          /^card/,
          /^tab/,
          /^session/,
          /^booking/,
          /^resource/,
          /^testimonial/,
          /^logo/,
          /^experience/,
          /^stats/,
          /^time-slot/,
          /^section/,
          /^collapsible/,
          /^about-me/,
          /^target-school/,
          /^concern/,
          /^backdrop/,
          /^overlay/,
          /^sidebar/,
          /^nav/,
          /^menu/,
          /^dropdown/,
          /^recent/,
          /^delete/,
          /^sign/,
          /^google/,
          /^user/,
          /^purchase/,
          /^bg/,
          /^inner/,
          /^main/,
        ],
        // Keep any class with these strings
        greedy: [
          /modal/,
          /active/,
          /open/,
          /close/,
          /show/,
          /hide/,
          /toggle/,
        ],
      },
      // Default extractor for non-jsx files
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
    }),
  ],
};

