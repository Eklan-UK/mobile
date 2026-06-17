const { withPodfile } = require('expo/config-plugins');

/**
 * AppCheckCore / GoogleUtilities require module maps when linked as static libraries.
 * Adds `use_modular_headers!` to the generated Podfile during prebuild (EAS Build).
 */
function withIosModularHeaders(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('use_modular_headers!')) {
      return config;
    }

    config.modResults.contents = contents.replace(
      /^platform :ios[^\n]*\n/m,
      (match) => `${match}use_modular_headers!\n`
    );
    return config;
  });
}

module.exports = withIosModularHeaders;
