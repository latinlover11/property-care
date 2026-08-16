module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/script.js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/_headers");

  eleventyConfig.on("eleventy.after", ({ results, dir }) => {
    const lines = results
      .filter((p) => p.outputPath.endsWith(".html") && p.url !== "/404.html" && p.url !== "/")
      .map((p) => `${p.url}  ${p.url.replace(/\.html$/, "")}  301!`);
    lines.unshift("/index.html  /  301!");
    require("fs").writeFileSync(require("path").join(dir.output, "_redirects"), lines.join("\n") + "\n");
  });
  eleventyConfig.addPassthroughCopy("src/vendor");
  eleventyConfig.addPassthroughCopy("src/apple-touch-icon.png");

  eleventyConfig.addFilter("cleanUrl", (url) => {
    return typeof url === "string" && url.endsWith(".html") ? url.slice(0, -5) : url;
  });

  eleventyConfig.addFilter("isSitemapPage", (path) => {
    return typeof path === "string" && path.endsWith(".html") && !path.includes("/service-areas/");
  });

  eleventyConfig.addFilter("sitemapPriority", (url) => {
    if (url === "/" || url === "/index.html") return "1.0";
    if (url === "/services.html" || url === "/portfolio.html" || url === "/contact.html" || url === "/service-areas.html") return "0.9";
    if (url.startsWith("/service-areas/")) return "0.8";
    if (url === "/privacy.html") return "0.3";
    return "0.7";
  });

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.html`;
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data"
    },
    htmlTemplateEngine: "njk"
  };
};
