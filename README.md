# PostCSS CSS Variables in `@media` queries

[PostCSS][postcss] plugin to use CSS Custom Properties in `@media` query parameters.

**There's no specification for this!**

# Example

```css
/* input */
:root {
    --min-width: 1000px;
}

@media (min-width: var(--min-width)) {
}
@media (max-width: calc(var(--min-width) - 1px)) {
}
```

```css
/* output */
@media (min-width: 1000px) {
}
@media (max-width: 999px) {
}
```

### Install

`npm install postcss-media-variables --save-dev`

# Usage

`postcss-media-variables` has to be used **twice**!

Every other plugin is optional, but keep this order of plugins if you use any of them.

- **`postcss-media-variables`** (first occurence)
- [`postcss-custom-media`][custom-media] (see below!)
- [`postcss-css-variables`][css-variables] and/or [`postcss-custom-properties`][custom-properties]
- [`postcss-calc`][calc]
- **`postcss-media-variables`** (second occurence)
- [`postcss-media-minmax`][media-minmax]

This plugin currently does not play very well with [`postcss-custom-media`][custom-media]!
Just don't use any `var()` in `@custom-media` definitions. I try to fix that.
The position of `postcss-custom-media` is choosen in the believe, I can fix it ;) At the moment, you can place it everywhere after the first (or second) occurence of `postcss-media-variables`.

### Example

```js
var postcss = require('postcss');

var mediaVariables = require('postcss-media-variables');
var cssVariables = require('postcss-css-variables');
var calc = require('postcss-calc');

var mycss = fs.readFileSync('input.css', 'utf8');

// Process your CSS with postcss-css-variables
var output = postcss([
        mediaVariables(), // first run
        cssVariables(/* options */),
        calc(/* options */),
        mediaVariables() // second run
    ])
    .process(mycss)
    .css;

console.log(output);
```
[*For more general PostCSS usage, see this section*](https://github.com/postcss/postcss#usage)

In the first run `postcss-media-variables` inserts a new elements into every `@media`-rule.
In the second run, it removes those elements and uses the newly calculated information from there to change the `@media`-rule parameters.

# Non-Standard and not proposed - so why?
This plugin is created in personal need of a solution for the issue [Resolve variables in media queries ](https://github.com/postcss/postcss-custom-properties/issues/24).



[postcss]: https://github.com/postcss/postcss
[css-variables]: https://github.com/MadLittleMods/postcss-css-variables
[custom-properties]: https://github.com/postcss/postcss-custom-properties
[calc]: https://github.com/postcss/postcss-calc
[custom-media]: https://github.com/postcss/postcss-custom-media
[media-minmax]: https://github.com/postcss/postcss-media-minmax
